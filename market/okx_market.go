package market

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"nofx/logger"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	okxMarketCandlesURL     = "https://www.okx.com/api/v5/market/candles"
	okxPublicFundingURL     = "https://www.okx.com/api/v5/public/funding-rate"
	okxPublicFundingHistURL = "https://www.okx.com/api/v5/public/funding-rate-history"
	okxPublicOpenIntURL     = "https://www.okx.com/api/v5/public/open-interest"
	okxRubikOIVolumeURL     = "https://www.okx.com/api/v5/rubik/stat/contracts/open-interest-volume"
	okxMaxKlineLimit        = 300
)

var errOKXSymbolNotListed = errors.New("symbol not listed on okx")

// okxUnlistedCache remembers symbols OKX does not list (e.g. code 51001) so
// subsequent cycles fall back without hitting OKX every time.
var okxUnlistedCache sync.Map // map[string]time.Time

var okxHTTPClient = &http.Client{Timeout: 15 * time.Second}

func isOKXUnlisted(symbol string) bool {
	ts, ok := okxUnlistedCache.Load(symbol)
	if !ok {
		return false
	}
	return time.Since(ts.(time.Time)) < unlistedSymbolTTL
}

func markOKXUnlisted(symbol string) {
	okxUnlistedCache.Store(symbol, time.Now())
}

// toOKXInstID converts normalized symbol (e.g. "BTCUSDT") to OKX perpetual swap instId ("BTC-USDT-SWAP").
func toOKXInstID(symbol string) string {
	norm := Normalize(symbol)
	base := strings.TrimSuffix(norm, "USDT")
	return base + "-USDT-SWAP"
}

func okxBaseCurrency(symbol string) string {
	return strings.TrimSuffix(Normalize(symbol), "USDT")
}

// toOKXBar maps standard timeframe strings to OKX bar parameter and duration in milliseconds.
func toOKXBar(interval string) (string, int64, error) {
	switch strings.ToLower(strings.TrimSpace(interval)) {
	case "1m":
		return "1m", 60 * 1000, nil
	case "3m":
		return "3m", 3 * 60 * 1000, nil
	case "5m":
		return "5m", 5 * 60 * 1000, nil
	case "15m":
		return "15m", 15 * 60 * 1000, nil
	case "30m":
		return "30m", 30 * 60 * 1000, nil
	case "1h":
		return "1H", 60 * 60 * 1000, nil
	case "2h":
		return "2H", 2 * 60 * 60 * 1000, nil
	case "4h":
		return "4H", 4 * 60 * 60 * 1000, nil
	case "6h":
		return "6H", 6 * 60 * 60 * 1000, nil
	case "12h":
		return "12H", 12 * 60 * 60 * 1000, nil
	case "1d":
		return "1Dutc", 24 * 60 * 60 * 1000, nil
	default:
		return "", 0, fmt.Errorf("unsupported OKX kline interval: %s", interval)
	}
}

func okxGetJSON(rawURL string, out interface{}) error {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return err
	}

	resp, err := okxHTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("okx request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("okx response read failed: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("okx HTTP %d", resp.StatusCode)
	}

	if err := json.Unmarshal(body, out); err != nil {
		return fmt.Errorf("okx JSON decode failed: %w", err)
	}
	return nil
}

// getKlinesFromOKX fetches perpetual swap K-lines from OKX public API in chronological order (oldest first).
func getKlinesFromOKX(symbol, interval string, limit int) ([]Kline, error) {
	bar, intervalMs, err := toOKXBar(interval)
	if err != nil {
		return nil, err
	}
	if limit <= 0 || limit > okxMaxKlineLimit {
		limit = okxMaxKlineLimit
	}

	instID := toOKXInstID(symbol)
	reqURL := fmt.Sprintf("%s?instId=%s&bar=%s&limit=%d",
		okxMarketCandlesURL, url.QueryEscape(instID), url.QueryEscape(bar), limit)

	var payload struct {
		Code string     `json:"code"`
		Msg  string     `json:"msg"`
		Data [][]string `json:"data"`
	}
	if err := okxGetJSON(reqURL, &payload); err != nil {
		return nil, err
	}
	if payload.Code != "0" {
		if payload.Code == "51001" {
			return nil, fmt.Errorf("%w: %s", errOKXSymbolNotListed, payload.Msg)
		}
		return nil, fmt.Errorf("okx candles error %s: %s", payload.Code, payload.Msg)
	}
	if len(payload.Data) == 0 {
		return nil, errors.New("okx returned an empty kline list")
	}

	return parseOKXCandles(payload.Data, intervalMs, symbol)
}

// parseOKXCandles converts OKX descending candle rows ([ts,o,h,l,c,vol,volCcy,volCcyQuote,confirm])
// into ascending []Kline (oldest first).
func parseOKXCandles(rows [][]string, intervalMs int64, symbol string) ([]Kline, error) {
	klines := make([]Kline, 0, len(rows))
	skipped := 0

	// OKX returns newest candle first; iterate backwards to produce chronological order.
	for i := len(rows) - 1; i >= 0; i-- {
		row := rows[i]
		if len(row) < 8 {
			skipped++
			continue
		}
		openTime, err := strconv.ParseInt(row[0], 10, 64)
		if err != nil {
			skipped++
			continue
		}
		open, err1 := strconv.ParseFloat(row[1], 64)
		high, err2 := strconv.ParseFloat(row[2], 64)
		low, err3 := strconv.ParseFloat(row[3], 64)
		closePx, err4 := strconv.ParseFloat(row[4], 64)
		volCcy, err5 := strconv.ParseFloat(row[6], 64)
		volQuote, err6 := strconv.ParseFloat(row[7], 64)
		if err1 != nil || err2 != nil || err3 != nil || err4 != nil || err5 != nil || err6 != nil {
			skipped++
			continue
		}

		klines = append(klines, Kline{
			OpenTime:    openTime,
			Open:        open,
			High:        high,
			Low:         low,
			Close:       closePx,
			Volume:      volCcy,
			CloseTime:   openTime + intervalMs - 1,
			QuoteVolume: volQuote,
		})
	}

	if skipped > 0 {
		logger.Warnf("⚠️ OKX kline parse skipped %d invalid rows for %s", skipped, symbol)
	}
	if len(klines) == 0 {
		return nil, errors.New("okx kline list is unparseable")
	}
	return klines, nil
}

// fetchCurrentFundingRateOKX fetches the current funding rate and next settlement time from OKX.
func fetchCurrentFundingRateOKX(symbol string) (float64, int64, error) {
	instID := toOKXInstID(symbol)
	reqURL := fmt.Sprintf("%s?instId=%s", okxPublicFundingURL, url.QueryEscape(instID))

	var payload struct {
		Code string `json:"code"`
		Msg  string `json:"msg"`
		Data []struct {
			FundingRate     string `json:"fundingRate"`
			NextFundingTime string `json:"nextFundingTime"`
		} `json:"data"`
	}
	if err := okxGetJSON(reqURL, &payload); err != nil {
		return 0, 0, err
	}
	if payload.Code != "0" || len(payload.Data) == 0 {
		return 0, 0, fmt.Errorf("okx funding-rate error %s: %s", payload.Code, payload.Msg)
	}

	rate, err := strconv.ParseFloat(payload.Data[0].FundingRate, 64)
	if err != nil {
		return 0, 0, err
	}
	nextMs, _ := strconv.ParseInt(payload.Data[0].NextFundingTime, 10, 64)
	return rate, nextMs, nil
}

// fetchFundingHistoryOKX derives 7d/30d funding statistics from OKX funding-rate-history.
func fetchFundingHistoryOKX(symbol string, current float64, nextFundingMs int64) *FundingStats {
	instID := toOKXInstID(symbol)
	reqURL := fmt.Sprintf("%s?instId=%s&limit=%d", okxPublicFundingHistURL, url.QueryEscape(instID), fundingHistoryLimit)

	var payload struct {
		Code string `json:"code"`
		Data []struct {
			FundingRate string `json:"fundingRate"`
			FundingTime string `json:"fundingTime"`
		} `json:"data"`
	}
	if err := okxGetJSON(reqURL, &payload); err != nil || payload.Code != "0" {
		return nil
	}

	// OKX returns newest settlement first; reverse to oldest-first so slicing tail gets recent 7d.
	rates := make([]float64, 0, len(payload.Data))
	for i := len(payload.Data) - 1; i >= 0; i-- {
		if v, err := strconv.ParseFloat(payload.Data[i].FundingRate, 64); err == nil {
			rates = append(rates, v)
		}
	}

	stats := &FundingStats{NextFundingMs: nextFundingMs}
	if len(rates) >= fundingMinSamples7d {
		start := len(rates) - fundingSamples7d
		if start < 0 {
			start = 0
		}
		window := rates[start:]
		stats.Avg7d = meanOf(window)
		stats.Pct7d = percentileOf(window, current)
		stats.Samples7d = len(window)
	}
	if len(rates) >= fundingMinSamples30d {
		stats.Pct30d = percentileOf(rates, current)
		stats.Samples30d = len(rates)
	}
	return stats
}

// getOpenInterestDataOKX fetches current SWAP open interest (in base asset units via oiCcy)
// and best-effort 15m OI percentage changes from OKX rubik statistics.
func getOpenInterestDataOKX(symbol string) (*OIData, error) {
	instID := toOKXInstID(symbol)
	reqURL := fmt.Sprintf("%s?instType=SWAP&instId=%s", okxPublicOpenIntURL, url.QueryEscape(instID))

	var payload struct {
		Code string `json:"code"`
		Msg  string `json:"msg"`
		Data []struct {
			OiCcy string `json:"oiCcy"`
		} `json:"data"`
	}
	if err := okxGetJSON(reqURL, &payload); err != nil {
		return nil, err
	}
	if payload.Code != "0" || len(payload.Data) == 0 {
		return nil, fmt.Errorf("okx open-interest error %s: %s", payload.Code, payload.Msg)
	}

	latestCcy, err := strconv.ParseFloat(payload.Data[0].OiCcy, 64)
	if err != nil || latestCcy <= 0 {
		return nil, fmt.Errorf("invalid okx oiCcy for %s", symbol)
	}

	oi := &OIData{Latest: latestCcy}

	// Best-effort percentage change history via rubik endpoint (returns newest first: [ts, oiUsd, volUsd]).
	ccy := okxBaseCurrency(symbol)
	if ccy != "" {
		rubikURL := fmt.Sprintf("%s?ccy=%s&period=15m", okxRubikOIVolumeURL, url.QueryEscape(ccy))
		var rubik struct {
			Code string     `json:"code"`
			Data [][]string `json:"data"`
		}
		if err := okxGetJSON(rubikURL, &rubik); err == nil && rubik.Code == "0" && len(rubik.Data) >= 2 {
			values := make([]float64, 0, len(rubik.Data))
			for i := len(rubik.Data) - 1; i >= 0; i-- {
				if len(rubik.Data[i]) < 2 {
					continue
				}
				if v, err := strconv.ParseFloat(rubik.Data[i][1], 64); err == nil && v > 0 {
					values = append(values, v)
				}
			}
			if len(values) >= 2 {
				oi.Change1hPct = oiChangeAgo(values, 1)
				oi.Change4hPct = oiChangeAgo(values, 4)
				oi.Change24hPct = oiChangeAgo(values, 24)
				oi.Samples = len(values)
			}
		}
	}

	return oi, nil
}
