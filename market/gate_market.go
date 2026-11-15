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
	gateFuturesBaseURL = "https://api.gateio.ws/api/v4/futures/usdt"
	gateMaxKlineLimit  = 1000
)

var errGateSymbolNotListed = errors.New("symbol not listed on gate")

var gateUnlistedCache sync.Map // map[string]time.Time

var gateHTTPClient = &http.Client{Timeout: 15 * time.Second}

func isGateUnlisted(symbol string) bool {
	ts, ok := gateUnlistedCache.Load(symbol)
	if !ok {
		return false
	}
	return time.Since(ts.(time.Time)) < unlistedSymbolTTL
}

func markGateUnlisted(symbol string) {
	gateUnlistedCache.Store(symbol, time.Now())
}

// toGateContract converts normalized symbol (e.g. "BTCUSDT") to Gate contract format ("BTC_USDT").
func toGateContract(symbol string) string {
	norm := Normalize(symbol)
	if strings.Contains(norm, "_") {
		return norm
	}
	base := strings.TrimSuffix(norm, "USDT")
	return base + "_USDT"
}

// toGateInterval maps standard timeframe strings to Gate futures intervals and duration in ms.
// Gate futures supports 1m, 5m, 15m, 30m, 1h, 4h, 8h, 1d (not 3m, 2h, 6h, 12h).
func toGateInterval(interval string) (string, int64, error) {
	switch strings.ToLower(strings.TrimSpace(interval)) {
	case "1m":
		return "1m", 60 * 1000, nil
	case "5m":
		return "5m", 5 * 60 * 1000, nil
	case "15m":
		return "15m", 15 * 60 * 1000, nil
	case "30m":
		return "30m", 30 * 60 * 1000, nil
	case "1h":
		return "1h", 60 * 60 * 1000, nil
	case "4h":
		return "4h", 4 * 60 * 60 * 1000, nil
	case "8h":
		return "8h", 8 * 60 * 60 * 1000, nil
	case "1d":
		return "1d", 24 * 60 * 60 * 1000, nil
	default:
		return "", 0, fmt.Errorf("unsupported Gate kline interval: %s", interval)
	}
}

func gateGetJSON(rawURL string, out interface{}) error {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return err
	}

	resp, err := gateHTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("gate request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("gate response read failed: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var apiErr struct {
			Label   string `json:"label"`
			Message string `json:"message"`
		}
		if json.Unmarshal(body, &apiErr) == nil && apiErr.Label == "CONTRACT_NOT_FOUND" {
			return fmt.Errorf("%w: %s", errGateSymbolNotListed, apiErr.Message)
		}
		return fmt.Errorf("gate HTTP %d", resp.StatusCode)
	}

	if err := json.Unmarshal(body, out); err != nil {
		return fmt.Errorf("gate JSON decode failed: %w", err)
	}
	return nil
}

type gateCandlestickRow struct {
	T   int64   `json:"t"`
	V   float64 `json:"v"`
	O   string  `json:"o"`
	H   string  `json:"h"`
	L   string  `json:"l"`
	C   string  `json:"c"`
	Sum string  `json:"sum"`
}

// getKlinesFromGate fetches USDT perpetual candlesticks from Gate public API in chronological order.
func getKlinesFromGate(symbol, interval string, limit int) ([]Kline, error) {
	iv, intervalMs, err := toGateInterval(interval)
	if err != nil {
		return nil, err
	}
	if limit <= 0 || limit > gateMaxKlineLimit {
		limit = gateMaxKlineLimit
	}

	contract := toGateContract(symbol)
	reqURL := fmt.Sprintf("%s/candlesticks?contract=%s&interval=%s&limit=%d",
		gateFuturesBaseURL, url.QueryEscape(contract), url.QueryEscape(iv), limit)

	var rows []gateCandlestickRow
	if err := gateGetJSON(reqURL, &rows); err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, errors.New("gate returned an empty kline list")
	}

	return parseGateCandles(rows, intervalMs, symbol)
}

func parseGateCandles(rows []gateCandlestickRow, intervalMs int64, symbol string) ([]Kline, error) {
	klines := make([]Kline, 0, len(rows))
	skipped := 0

	// Ensure chronological order (Gate candlesticks are oldest-first, guard against reversed payloads).
	reverse := len(rows) >= 2 && rows[0].T > rows[len(rows)-1].T
	for idx := 0; idx < len(rows); idx++ {
		i := idx
		if reverse {
			i = len(rows) - 1 - idx
		}
		row := rows[i]
		open, err1 := strconv.ParseFloat(row.O, 64)
		high, err2 := strconv.ParseFloat(row.H, 64)
		low, err3 := strconv.ParseFloat(row.L, 64)
		closePx, err4 := strconv.ParseFloat(row.C, 64)
		if err1 != nil || err2 != nil || err3 != nil || err4 != nil {
			skipped++
			continue
		}

		quoteVol, _ := strconv.ParseFloat(row.Sum, 64)
		baseVol := row.V
		if quoteVol > 0 && closePx > 0 {
			baseVol = quoteVol / closePx
		}
		openTimeMs := row.T * 1000
		klines = append(klines, Kline{
			OpenTime:    openTimeMs,
			Open:        open,
			High:        high,
			Low:         low,
			Close:       closePx,
			Volume:      baseVol,
			CloseTime:   openTimeMs + intervalMs - 1,
			QuoteVolume: quoteVol,
		})
	}

	if skipped > 0 {
		logger.Warnf("⚠️ Gate kline parse skipped %d invalid rows for %s", skipped, symbol)
	}
	if len(klines) == 0 {
		return nil, errors.New("gate kline list is unparseable")
	}
	return klines, nil
}

type gateContractDetail struct {
	FundingRate      string `json:"funding_rate"`
	FundingNextApply int64  `json:"funding_next_apply"`
	PositionSize     int64  `json:"position_size"`
	QuantoMultiplier string `json:"quanto_multiplier"`
}

func fetchGateContractDetail(symbol string) (*gateContractDetail, error) {
	contract := toGateContract(symbol)
	reqURL := fmt.Sprintf("%s/contracts/%s", gateFuturesBaseURL, url.QueryEscape(contract))

	var detail gateContractDetail
	if err := gateGetJSON(reqURL, &detail); err != nil {
		return nil, err
	}
	return &detail, nil
}

// fetchCurrentFundingRateGate fetches current funding rate and next settlement ms from Gate.
func fetchCurrentFundingRateGate(symbol string) (float64, int64, error) {
	detail, err := fetchGateContractDetail(symbol)
	if err != nil {
		return 0, 0, err
	}
	rate, err := strconv.ParseFloat(detail.FundingRate, 64)
	if err != nil {
		return 0, 0, err
	}
	return rate, detail.FundingNextApply * 1000, nil
}

// fetchFundingHistoryGate derives 7d/30d funding statistics from Gate funding_rate history.
func fetchFundingHistoryGate(symbol string, current float64, nextFundingMs int64) *FundingStats {
	contract := toGateContract(symbol)
	reqURL := fmt.Sprintf("%s/funding_rate?contract=%s&limit=%d",
		gateFuturesBaseURL, url.QueryEscape(contract), fundingHistoryLimit)

	var rows []struct {
		T int64  `json:"t"`
		R string `json:"r"`
	}
	if err := gateGetJSON(reqURL, &rows); err != nil || len(rows) == 0 {
		return nil
	}

	reverse := len(rows) >= 2 && rows[0].T > rows[len(rows)-1].T
	rates := make([]float64, 0, len(rows))
	for idx := 0; idx < len(rows); idx++ {
		i := idx
		if reverse {
			i = len(rows) - 1 - idx
		}
		if v, err := strconv.ParseFloat(rows[i].R, 64); err == nil {
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

// getOpenInterestDataGate fetches current USDT perpetual OI (in base asset units)
// and best-effort 15m OI percentage changes from Gate contract_stats.
func getOpenInterestDataGate(symbol string) (*OIData, error) {
	detail, err := fetchGateContractDetail(symbol)
	if err != nil {
		return nil, err
	}
	qm, _ := strconv.ParseFloat(detail.QuantoMultiplier, 64)
	if qm <= 0 {
		qm = 1.0
	}
	latestBase := float64(detail.PositionSize) * qm
	if latestBase <= 0 {
		return nil, fmt.Errorf("invalid gate open interest for %s", symbol)
	}

	oi := &OIData{Latest: latestBase}

	contract := toGateContract(symbol)
	statsURL := fmt.Sprintf("%s/contract_stats?contract=%s&interval=15m&limit=%d",
		gateFuturesBaseURL, url.QueryEscape(contract), oiBucketLimit)
	var statsRows []struct {
		Time         int64   `json:"time"`
		OpenInterest float64 `json:"open_interest"`
	}
	if err := gateGetJSON(statsURL, &statsRows); err == nil && len(statsRows) >= 2 {
		reverse := statsRows[0].Time > statsRows[len(statsRows)-1].Time
		values := make([]float64, 0, len(statsRows))
		for idx := 0; idx < len(statsRows); idx++ {
			i := idx
			if reverse {
				i = len(statsRows) - 1 - idx
			}
			if statsRows[i].OpenInterest > 0 {
				values = append(values, statsRows[i].OpenInterest)
			}
		}
		if len(values) >= 2 {
			oi.Change1hPct = oiChangeAgo(values, 1)
			oi.Change4hPct = oiChangeAgo(values, 4)
			oi.Change24hPct = oiChangeAgo(values, 24)
			oi.Samples = len(values)
		}
	}

	return oi, nil
}
