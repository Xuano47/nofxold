package market

import (
	"math"
	"strings"
	"testing"
	"time"
)

func makeSyntheticDailyKlines(closes []float64, lowDelta, highDelta float64, startUTC time.Time, includeForming bool) []Kline {
	dayMs := int64(24 * time.Hour / time.Millisecond)
	out := make([]Kline, 0, len(closes)+1)
	for i, c := range closes {
		openMs := startUTC.Add(time.Duration(i) * 24 * time.Hour).UnixMilli()
		out = append(out, Kline{
			OpenTime:  openMs,
			Open:      c,
			High:      c + highDelta,
			Low:       c - lowDelta,
			Close:     c,
			Volume:    1000,
			CloseTime: openMs + dayMs - 1,
		})
	}
	if includeForming {
		i := len(closes)
		openMs := startUTC.Add(time.Duration(i) * 24 * time.Hour).UnixMilli()
		lastClose := closes[len(closes)-1]
		out = append(out, Kline{
			OpenTime:  openMs,
			Open:      lastClose,
			High:      lastClose * 3.0, // Extreme outlier that must be ignored if bar is still forming
			Low:       lastClose * 0.1,
			Close:     lastClose * 2.0,
			Volume:    500,
			CloseTime: openMs + dayMs - 1,
		})
	}
	return out
}

func TestDailyContext_ComputeAndExcludesFormingBar(t *testing.T) {
	start := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	closes := make([]float64, 60)
	for i := range closes {
		// Monotonically rising trend so EMA20 and EMA50 slopes are clearly positive.
		closes[i] = 100.0 + float64(i)*2.0
	}

	klines := makeSyntheticDailyKlines(closes, 5.0, 5.0, start, true)
	// nowMs is inside the 61st bar (the forming bar), 2 hours after its open.
	formingOpen := start.Add(60 * 24 * time.Hour)
	nowMs := formingOpen.Add(2 * time.Hour).UnixMilli()

	dc := computeDailyContext(klines, nowMs)
	if dc == nil {
		t.Fatalf("expected non-nil DailyContextData")
	}
	if dc.RangeDays != 30 {
		t.Fatalf("expected RangeDays=30, got %d", dc.RangeDays)
	}

	// Last 30 closed bars: indices 30..59 (closes 160..218), with +-5 low/high => [155, 223].
	// Forming bar outlier (high 654, low 21.8) must be excluded.
	if math.Abs(dc.RangeLow-155.0) > 1e-6 || math.Abs(dc.RangeHigh-223.0) > 1e-6 {
		t.Fatalf("forming bar polluted closed range: got [%.2f ~ %.2f], want [155 ~ 223]", dc.RangeLow, dc.RangeHigh)
	}
	if !dc.HasEMA20 || !dc.HasEMA20Slope || dc.EMA20SlopePct <= 0.3 {
		t.Fatalf("expected positive EMA20 slope, got HasEMA20=%v HasSlope=%v pct=%.3f", dc.HasEMA20, dc.HasEMA20Slope, dc.EMA20SlopePct)
	}
	if !dc.HasEMA50 || !dc.HasEMA50Slope || dc.EMA50SlopePct <= 0.3 {
		t.Fatalf("expected positive EMA50 slope, got HasEMA50=%v HasSlope=%v pct=%.3f", dc.HasEMA50, dc.HasEMA50Slope, dc.EMA50SlopePct)
	}

	expectedLastClosedClose := formingOpen.UnixMilli() - 1
	if dc.LastClosedClose != expectedLastClosedClose {
		t.Fatalf("LastClosedClose mismatch: got %d, want %d", dc.LastClosedClose, expectedLastClosedClose)
	}
}

func TestDailyContext_NewCoinDegradation(t *testing.T) {
	start := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	nowMs := start.Add(250 * 24 * time.Hour).UnixMilli()

	makeCloses := func(n int) []float64 {
		c := make([]float64, n)
		for i := range c {
			c[i] = 100.0 + float64(i)
		}
		return c
	}

	// <3 days => nil & empty prompt line
	if dc := computeDailyContext(makeSyntheticDailyKlines(makeCloses(2), 1, 1, start, false), nowMs); dc != nil {
		t.Fatalf("expected nil for <3 closed bars, got %+v", dc)
	}

	// 10 days => Range(10d) only, no EMA20/EMA50
	dc10 := computeDailyContext(makeSyntheticDailyKlines(makeCloses(10), 1, 1, start, false), nowMs)
	if dc10 == nil || dc10.RangeDays != 10 || dc10.HasEMA20 || dc10.HasEMA50 {
		t.Fatalf("unexpected 10d degradation: %+v", dc10)
	}
	line10 := FormatDailyContextPromptLine(dc10, 105)
	if !strings.Contains(line10, "Range(10d)") || strings.Contains(line10, "EMA20") || strings.Contains(line10, "EMA50") {
		t.Fatalf("unexpected 10d line: %s", line10)
	}

	// 20 days => EMA20 present without slope
	dc20 := computeDailyContext(makeSyntheticDailyKlines(makeCloses(20), 1, 1, start, false), nowMs)
	if dc20 == nil || dc20.RangeDays != 20 || !dc20.HasEMA20 || dc20.HasEMA20Slope || dc20.HasEMA50 {
		t.Fatalf("unexpected 20d degradation: %+v", dc20)
	}

	// 23 days => EMA20 with 3d slope present
	dc23 := computeDailyContext(makeSyntheticDailyKlines(makeCloses(23), 1, 1, start, false), nowMs)
	if dc23 == nil || !dc23.HasEMA20 || !dc23.HasEMA20Slope || dc23.HasEMA50 {
		t.Fatalf("unexpected 23d degradation: %+v", dc23)
	}

	// 50 days => EMA50 present without 5d slope
	dc50 := computeDailyContext(makeSyntheticDailyKlines(makeCloses(50), 1, 1, start, false), nowMs)
	if dc50 == nil || dc50.RangeDays != 30 || !dc50.HasEMA50 || dc50.HasEMA50Slope {
		t.Fatalf("unexpected 50d degradation: %+v", dc50)
	}

	// 55 days => EMA50 with 5d slope present
	dc55 := computeDailyContext(makeSyntheticDailyKlines(makeCloses(55), 1, 1, start, false), nowMs)
	if dc55 == nil || !dc55.HasEMA50 || !dc55.HasEMA50Slope {
		t.Fatalf("unexpected 55d degradation: %+v", dc55)
	}
}

func TestDailyContext_FormatAndBreakoutAndSlopeDeadzone(t *testing.T) {
	dc := &DailyContextData{
		RangeDays:     30,
		RangeLow:      54200,
		RangeHigh:     71800,
		HasEMA20:      true,
		EMA20:         64800,
		HasEMA20Slope: true,
		EMA20SlopePct: -1.5, // <= -0.3 => slope↓
		HasEMA50:      true,
		EMA50:         67200,
		HasEMA50Slope: true,
		EMA50SlopePct: 0.12, // |pct| < 0.3 => slope→
	}

	// Mid-range (~29%)
	mid := FormatDailyContextPromptLine(dc, 59304)
	if !strings.Contains(mid, "1D Context: Range(30d) [54200.00 ~ 71800.00] (pos 29%)") {
		t.Fatalf("unexpected mid-range output: %s", mid)
	}
	if !strings.Contains(mid, "EMA20 64800.00 (-8.5%, slope↓)") {
		t.Fatalf("expected EMA20 slope↓ and negative dist%%, got: %s", mid)
	}
	if !strings.Contains(mid, "EMA50 67200.00 (-11.8%, slope→)") {
		t.Fatalf("expected EMA50 deadzone slope→, got: %s", mid)
	}
	if strings.Contains(mid, "ATR") {
		t.Fatalf("1D Context must omit 1D ATR, got: %s", mid)
	}

	// Breakout low: large negative (-3%)
	lowBig := FormatDailyContextPromptLine(dc, 53672)
	if !strings.Contains(lowBig, "(pos -3%, new 30d low)") {
		t.Fatalf("expected unclamped negative breakout pos%%, got: %s", lowBig)
	}

	// Breakout low: slight negative (-0.2%)
	lowTiny := FormatDailyContextPromptLine(dc, 54165)
	if !strings.Contains(lowTiny, "(pos -0.2%, new 30d low)") {
		t.Fatalf("expected decimal negative breakout pos%%, got: %s", lowTiny)
	}

	// Breakout high: large positive (104%)
	highBig := FormatDailyContextPromptLine(dc, 72504)
	if !strings.Contains(highBig, "(pos 104%, new 30d high)") {
		t.Fatalf("expected unclamped positive breakout pos%%, got: %s", highBig)
	}

	// Breakout high: slight positive (100.2%)
	highTiny := FormatDailyContextPromptLine(dc, 71835)
	if !strings.Contains(highTiny, "(pos 100.2%, new 30d high)") {
		t.Fatalf("expected decimal positive breakout pos%%, got: %s", highTiny)
	}

	// Exact boundary (equal to RangeLow) should NOT claim "new 30d low"
	exactLow := FormatDailyContextPromptLine(dc, 54200)
	if strings.Contains(exactLow, "new 30d low") || !strings.Contains(exactLow, "(pos 0%)") {
		t.Fatalf("exact RangeLow should show (pos 0%%) without new low tag, got: %s", exactLow)
	}
}

func TestDailyContext_CacheFreshnessAndRollover(t *testing.T) {
	lastClosedClose := time.Date(2026, 11, 23, 23, 59, 59, 999*1e6, time.UTC).UnixMilli()
	fetchedAt := time.Date(2026, 11, 24, 23, 30, 0, 0, time.UTC)

	entry := dailyContextCacheEntry{
		data:      &DailyContextData{RangeDays: 30, LastClosedClose: lastClosedClose},
		fetchedAt: fetchedAt,
	}

	// Still same UTC day, 20 min later => fresh
	if !isDailyContextFresh(entry, fetchedAt.Add(20*time.Minute)) {
		t.Fatalf("expected cache entry to be fresh before daily rollover and 1h TTL")
	}

	// Crosses UTC 00:00 (lastClosedClose + 24h) just 31 min after fetch => invalid immediately
	if isDailyContextFresh(entry, fetchedAt.Add(31*time.Minute)) {
		t.Fatalf("expected cache entry to invalidate immediately on daily bar close rollover")
	}

	// Well inside the same day, >= 1h TTL => invalid
	midDayFetch := time.Date(2026, 11, 24, 10, 0, 0, 0, time.UTC)
	midEntry := dailyContextCacheEntry{
		data:      &DailyContextData{RangeDays: 30, LastClosedClose: lastClosedClose},
		fetchedAt: midDayFetch,
	}
	if isDailyContextFresh(midEntry, midDayFetch.Add(time.Hour)) {
		t.Fatalf("expected cache entry to expire after 1h max TTL")
	}

	// Nil entry expires across UTC date rollover
	nilEntry := dailyContextCacheEntry{data: nil, fetchedAt: fetchedAt}
	if isDailyContextFresh(nilEntry, fetchedAt.Add(31*time.Minute)) {
		t.Fatalf("expected nil cache entry to invalidate across UTC date boundary")
	}
}
