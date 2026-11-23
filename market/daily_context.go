package market

import (
	"fmt"
	"math"
	"nofx/logger"
	"strings"
	"sync"
	"time"
)

const (
	dailyContextFetchLimit         = 200
	dailyContextRangeMaxDays       = 30
	dailyContextMinDays            = 3
	dailyContextEMA20SlopeLag      = 3
	dailyContextEMA50SlopeLag      = 5
	dailyContextSlopeFlatThreshold = 0.3
	dailyContextMaxCacheTTL        = time.Hour
	dailyContextDayMs              = int64(24 * time.Hour / time.Millisecond)
)

type dailyContextCacheEntry struct {
	data      *DailyContextData
	fetchedAt time.Time
}

var dailyContextCache sync.Map // "<exchange>:<symbol>" -> dailyContextCacheEntry

func isDailyContextFresh(entry dailyContextCacheEntry, now time.Time) bool {
	if now.Sub(entry.fetchedAt) >= dailyContextMaxCacheTTL {
		return false
	}
	if entry.data != nil && entry.data.LastClosedClose > 0 {
		return now.UnixMilli() < entry.data.LastClosedClose+dailyContextDayMs
	}
	return now.UTC().Format("2006-01-02") == entry.fetchedAt.UTC().Format("2006-01-02")
}

func computeClosedEMASeries(bars []Kline, period int) []float64 {
	if period <= 0 || len(bars) < period {
		return nil
	}
	sum := 0.0
	for i := 0; i < period; i++ {
		sum += bars[i].Close
	}
	ema := sum / float64(period)
	out := make([]float64, 0, len(bars)-period+1)
	out = append(out, ema)

	multiplier := 2.0 / float64(period+1)
	for i := period; i < len(bars); i++ {
		ema = (bars[i].Close-ema)*multiplier + ema
		out = append(out, ema)
	}
	return out
}

func computeDailyContext(klines []Kline, nowMs int64) *DailyContextData {
	closed := klines
	if len(closed) > 0 && closed[len(closed)-1].CloseTime > 0 && closed[len(closed)-1].CloseTime > nowMs {
		closed = closed[:len(closed)-1]
	}
	if len(closed) < dailyContextMinDays {
		return nil
	}

	rangeDays := len(closed)
	if rangeDays > dailyContextRangeMaxDays {
		rangeDays = dailyContextRangeMaxDays
	}

	window := closed[len(closed)-rangeDays:]
	rangeLow := window[0].Low
	rangeHigh := window[0].High
	for _, b := range window[1:] {
		if b.Low < rangeLow {
			rangeLow = b.Low
		}
		if b.High > rangeHigh {
			rangeHigh = b.High
		}
	}

	dc := &DailyContextData{
		RangeDays:       rangeDays,
		RangeLow:        rangeLow,
		RangeHigh:       rangeHigh,
		LastClosedClose: closed[len(closed)-1].CloseTime,
	}

	if series20 := computeClosedEMASeries(closed, 20); len(series20) > 0 {
		dc.HasEMA20 = true
		dc.EMA20 = series20[len(series20)-1]
		if len(series20) > dailyContextEMA20SlopeLag {
			if prev := series20[len(series20)-1-dailyContextEMA20SlopeLag]; prev > 0 {
				dc.HasEMA20Slope = true
				dc.EMA20SlopePct = ((dc.EMA20 - prev) / prev) * 100
			}
		}
	}

	if series50 := computeClosedEMASeries(closed, 50); len(series50) > 0 {
		dc.HasEMA50 = true
		dc.EMA50 = series50[len(series50)-1]
		if len(series50) > dailyContextEMA50SlopeLag {
			if prev := series50[len(series50)-1-dailyContextEMA50SlopeLag]; prev > 0 {
				dc.HasEMA50Slope = true
				dc.EMA50SlopePct = ((dc.EMA50 - prev) / prev) * 100
			}
		}
	}

	return dc
}

func getDailyContextWithExchange(symbol, exchange string, existing1d []Kline) *DailyContextData {
	symbol = Normalize(symbol)
	exchange = normalizeMarketExchange(exchange)
	now := time.Now()
	cacheKey := exchange + ":" + symbol

	if len(existing1d) >= dailyContextFetchLimit {
		dc := computeDailyContext(existing1d, now.UnixMilli())
		dailyContextCache.Store(cacheKey, dailyContextCacheEntry{data: dc, fetchedAt: now})
		return dc
	}

	if cached, ok := dailyContextCache.Load(cacheKey); ok {
		entry := cached.(dailyContextCacheEntry)
		if isDailyContextFresh(entry, now) {
			return entry.data
		}
	}

	klines, err := getKlinesWithFallback(symbol, "1d", exchange, dailyContextFetchLimit)
	if err != nil {
		logger.Infof("⚠️ Failed to get %s 1d context (%s): %v", symbol, exchange, err)
		return nil
	}

	dc := computeDailyContext(klines, now.UnixMilli())
	dailyContextCache.Store(cacheKey, dailyContextCacheEntry{data: dc, fetchedAt: now})
	return dc
}

func formatDailyEMA(label string, emaVal, currentPrice float64, hasSlope bool, slopePct float64) string {
	valStr := formatPriceWithDynamicPrecision(emaVal)
	var details []string
	if emaVal > 0 && currentPrice > 0 {
		distPct := ((currentPrice - emaVal) / emaVal) * 100
		details = append(details, fmt.Sprintf("%+.1f%%", distPct))
	}
	if hasSlope {
		slopeStr := "slope→"
		if slopePct >= dailyContextSlopeFlatThreshold {
			slopeStr = "slope↑"
		} else if slopePct <= -dailyContextSlopeFlatThreshold {
			slopeStr = "slope↓"
		}
		details = append(details, slopeStr)
	}
	if len(details) == 0 {
		return fmt.Sprintf("%s %s", label, valStr)
	}
	return fmt.Sprintf("%s %s (%s)", label, valStr, strings.Join(details, ", "))
}

// FormatDailyContextPromptLine formats per-coin closed 1D range and EMA context (no 1D ATR).
func FormatDailyContextPromptLine(dc *DailyContextData, currentPrice float64) string {
	if dc == nil || dc.RangeDays < dailyContextMinDays || dc.RangeLow <= 0 || dc.RangeHigh <= 0 {
		return ""
	}

	lowStr := formatPriceWithDynamicPrecision(dc.RangeLow)
	highStr := formatPriceWithDynamicPrecision(dc.RangeHigh)
	rangePart := fmt.Sprintf("Range(%dd) [%s ~ %s]", dc.RangeDays, lowStr, highStr)

	if dc.RangeHigh > dc.RangeLow && currentPrice > 0 {
		posPct := ((currentPrice - dc.RangeLow) / (dc.RangeHigh - dc.RangeLow)) * 100
		posInt := int(math.Round(posPct))
		switch {
		case currentPrice < dc.RangeLow:
			if posInt >= 0 {
				rangePart += fmt.Sprintf(" (pos %.1f%%, new %dd low)", posPct, dc.RangeDays)
			} else {
				rangePart += fmt.Sprintf(" (pos %d%%, new %dd low)", posInt, dc.RangeDays)
			}
		case currentPrice > dc.RangeHigh:
			if posInt <= 100 {
				rangePart += fmt.Sprintf(" (pos %.1f%%, new %dd high)", posPct, dc.RangeDays)
			} else {
				rangePart += fmt.Sprintf(" (pos %d%%, new %dd high)", posInt, dc.RangeDays)
			}
		default:
			rangePart += fmt.Sprintf(" (pos %d%%)", posInt)
		}
	}

	parts := []string{rangePart}
	if dc.HasEMA20 && dc.EMA20 > 0 {
		parts = append(parts, formatDailyEMA("EMA20", dc.EMA20, currentPrice, dc.HasEMA20Slope, dc.EMA20SlopePct))
	}
	if dc.HasEMA50 && dc.EMA50 > 0 {
		parts = append(parts, formatDailyEMA("EMA50", dc.EMA50, currentPrice, dc.HasEMA50Slope, dc.EMA50SlopePct))
	}

	return "1D Context: " + strings.Join(parts, " | ")
}
