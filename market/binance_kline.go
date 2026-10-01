package market

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"nofx/logger"
	"strconv"
	"sync"
	"time"
)

// Direct Binance K-line access.
//
// Binance is preferred over the CoinAnk proxy for Binance-listed symbols:
// the in-progress candle is live (updating price/volume) instead of being
// frozen with zero volume, and there is no third-party rate limiting.
// CoinAnk stays as fallback for non-listed symbols or Binance failures.

// errBinanceSymbolNotListed marks a definitive "symbol does not exist on
// Binance" response (API code -1121) so the negative cache can skip retrying.
var errBinanceSymbolNotListed = errors.New("symbol not listed on binance")

// unlistedSymbolCache remembers symbols Binance does not list, avoiding a
// failing request on every trading cycle. symbol -> time.Time (last check).
var unlistedSymbolCache sync.Map

const unlistedSymbolTTL = time.Hour

var binanceKlineClient = &http.Client{Timeout: 15 * time.Second}

// isBinanceUnlisted reports whether the symbol recently failed as not listed.
func isBinanceUnlisted(symbol string) bool {
	v, ok := unlistedSymbolCache.Load(symbol)
	if !ok {
		return false
	}
	return time.Since(v.(time.Time)) < unlistedSymbolTTL
}

func markBinanceUnlisted(symbol string) {
	unlistedSymbolCache.Store(symbol, time.Now())
}

// getKlinesFromBinance fetches futures K-lines directly from Binance.
func getKlinesFromBinance(symbol, interval string, limit int) ([]Kline, error) {
	if limit <= 0 || limit > binanceMaxKlineLimit {
		limit = binanceMaxKlineLimit
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, binanceFuturesKlinesURL, nil)
	if err != nil {
		return nil, err
	}
	q := req.URL.Query()
	q.Set("symbol", symbol)
	q.Set("interval", interval)
	q.Set("limit", strconv.Itoa(limit))
	req.URL.RawQuery = q.Encode()

	resp, err := binanceKlineClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("binance request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, fmt.Errorf("binance response read failed: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		if code, msg, ok := parseBinanceErrorCode(body); ok && code == -1121 {
			return nil, fmt.Errorf("%w: %s", errBinanceSymbolNotListed, msg)
		}
		return nil, fmt.Errorf("binance HTTP %d", resp.StatusCode)
	}

	var rows []KlineResponse
	if err := json.Unmarshal(body, &rows); err != nil {
		return nil, fmt.Errorf("binance kline decode failed: %w", err)
	}
	if len(rows) == 0 {
		return nil, errors.New("binance returned an empty kline list")
	}

	klines := make([]Kline, 0, len(rows))
	skipped := 0
	for _, row := range rows {
		kline, err := parseKline(row)
		if err != nil {
			skipped++
			continue
		}
		klines = append(klines, kline)
	}
	if skipped > 0 {
		logger.Warnf("⚠️ Binance kline parse skipped %d invalid rows for %s", skipped, symbol)
	}
	if len(klines) == 0 {
		return nil, errors.New("binance kline list is unparseable")
	}
	return klines, nil
}

// parseBinanceErrorCode extracts code/msg from a Binance error payload.
func parseBinanceErrorCode(body []byte) (int, string, bool) {
	var apiErr struct {
		Code int    `json:"code"`
		Msg  string `json:"msg"`
	}
	if err := json.Unmarshal(body, &apiErr); err != nil || apiErr.Code == 0 {
		return 0, "", false
	}
	return apiErr.Code, apiErr.Msg, true
}

// getKlinesWithFallback prefers direct Binance access and falls back to
// CoinAnk for non-listed symbols or when Binance is unreachable.
// The exchange parameter is only used by the CoinAnk fallback path.
func getKlinesWithFallback(symbol, interval, exchange string, limit int) ([]Kline, error) {
	symbol = Normalize(symbol)

	if !isBinanceUnlisted(symbol) {
		klines, err := getKlinesFromBinance(symbol, interval, limit)
		if err == nil {
			return klines, nil
		}
		if errors.Is(err, errBinanceSymbolNotListed) {
			markBinanceUnlisted(symbol)
			logger.Warnf("⚠️ %s not listed on Binance, using CoinAnk instead", symbol)
		} else {
			logger.Warnf("⚠️ Binance direct kline failed for %s (%s), falling back to CoinAnk: %v", symbol, interval, err)
		}
	}

	return getKlinesFromCoinAnk(symbol, interval, exchange, limit)
}
