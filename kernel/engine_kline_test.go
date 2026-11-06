package kernel

import (
	"strings"
	"testing"
	"time"

	"nofx/market"
	"nofx/store"
)

func TestFormatTimeframeSeriesData_Modes(t *testing.T) {
	engine := &StrategyEngine{}

	// Create 10 dummy Klines
	now := time.Now().UnixMilli()
	klines := make([]market.Kline, 10)
	for i := 0; i < 10; i++ {
		klines[i] = market.Kline{
			Time:   now + int64(i*60000),
			Open:   100.0 + float64(i),
			High:   105.0 + float64(i),
			Low:    95.0 + float64(i),
			Close:  102.0 + float64(i),
			Volume: 1000.0,
		}
	}
	// Extremes across all 10 bars:
	// Low min = 95.0 (bar 0)
	// High max = 114.0 (bar 9: 105 + 9)
	// LastBar Close = 111.0 (bar 9: 102 + 9)
	// FirstBar Open = 100.0 (bar 0)

	tfData := &market.TimeframeSeriesData{
		Klines: klines,
	}

	t.Run("Compact Mode", func(t *testing.T) {
		indicators := store.IndicatorConfig{
			KlineMode: "compact",
		}

		var sb strings.Builder
		engine.formatTimeframeSeriesData(&sb, tfData, indicators)
		output := sb.String()

		if !strings.Contains(output, "Range (10 bars):") {
			t.Errorf("Expected 'Range (10 bars):', got %s", output)
		}
		if !strings.Contains(output, "Position in Range:") {
			t.Errorf("Expected 'Position in Range:', got %s", output)
		}
		if !strings.Contains(output, "Net Change:") {
			t.Errorf("Expected 'Net Change:', got %s", output)
		}

		// Count lines in CSV table (excluding header and summary)
		lines := strings.Split(strings.TrimSpace(output), "\n")
		// Header lines:
		// Line 0: Range (10 bars)...
		// Line 1: Time,O,H,L,C,V
		// Followed by 5 data rows
		csvRows := 0
		for _, line := range lines {
			if strings.Contains(line, ",") && !strings.HasPrefix(line, "Time,") && !strings.Contains(line, "Range") {
				csvRows++
			}
		}
		if csvRows != 5 {
			t.Errorf("Expected exactly 5 CSV rows in compact mode, got %d. Output:\n%s", csvRows, output)
		}
	})

	t.Run("Full Mode", func(t *testing.T) {
		indicators := store.IndicatorConfig{
			KlineMode: "full",
		}

		var sb strings.Builder
		engine.formatTimeframeSeriesData(&sb, tfData, indicators)
		output := sb.String()

		if strings.Contains(output, "Range (10 bars):") {
			t.Errorf("Did not expect 'Range (10 bars):' in full mode, got %s", output)
		}

		lines := strings.Split(strings.TrimSpace(output), "\n")
		csvRows := 0
		for _, line := range lines {
			if strings.Contains(line, ",") && !strings.HasPrefix(line, "Time,") {
				csvRows++
			}
		}
		if csvRows != 10 {
			t.Errorf("Expected exactly 10 CSV rows in full mode, got %d. Output:\n%s", csvRows, output)
		}
	})

	t.Run("Default Empty Mode (Non-destructive Fallback to Full)", func(t *testing.T) {
		indicators := store.IndicatorConfig{
			KlineMode: "",
		}

		var sb strings.Builder
		engine.formatTimeframeSeriesData(&sb, tfData, indicators)
		output := sb.String()

		if strings.Contains(output, "Range (10 bars):") {
			t.Errorf("Did not expect 'Range (10 bars):' in default empty mode, got %s", output)
		}

		lines := strings.Split(strings.TrimSpace(output), "\n")
		csvRows := 0
		for _, line := range lines {
			if strings.Contains(line, ",") && !strings.HasPrefix(line, "Time,") {
				csvRows++
			}
		}
		if csvRows != 10 {
			t.Errorf("Expected exactly 10 CSV rows in fallback full mode, got %d. Output:\n%s", csvRows, output)
		}
	})
}
