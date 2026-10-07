package kernel

import (
	"testing"
)

// TestLeverageFallback tests automatic correction when leverage exceeds limit
func TestLeverageFallback(t *testing.T) {
	tests := []struct {
		name          string
		decision      Decision
		accountEquity float64
		maxLeverage   int
		maxPosRatio   float64
		wantLeverage  int // Expected leverage after correction
		wantError     bool
	}{
		{
			name: "Leverage exceeded - auto-correct to limit",
			decision: Decision{
				Symbol:          "SOLUSDT",
				Action:          "open_long",
				Leverage:        20, // Exceeds limit
				PositionSizeUSD: 100,
				StopLoss:        50,
				TakeProfit:      200,
			},
			accountEquity: 100,
			maxLeverage:   5, // Limit 5x
			maxPosRatio:   2.0,
			wantLeverage:  5, // Should be corrected to 5
			wantError:     false,
		},
		{
			name: "BTC leverage exceeded - auto-correct to limit",
			decision: Decision{
				Symbol:          "BTCUSDT",
				Action:          "open_long",
				Leverage:        20, // Exceeds limit
				PositionSizeUSD: 500,
				StopLoss:        90000,
				TakeProfit:      110000,
			},
			accountEquity: 100,
			maxLeverage:   10, // Limit 10x
			maxPosRatio:   10.0,
			wantLeverage:  10, // Should be corrected to 10
			wantError:     false,
		},
		{
			name: "Leverage within limit - no correction",
			decision: Decision{
				Symbol:          "ETHUSDT",
				Action:          "open_short",
				Leverage:        5, // Not exceeded
				PositionSizeUSD: 500,
				StopLoss:        4000,
				TakeProfit:      3000,
			},
			accountEquity: 100,
			maxLeverage:   10,
			maxPosRatio:   10.0,
			wantLeverage:  5, // Stays unchanged
			wantError:     false,
		},
		{
			name: "Leverage is 0 - should error",
			decision: Decision{
				Symbol:          "SOLUSDT",
				Action:          "open_long",
				Leverage:        0, // Invalid
				PositionSizeUSD: 100,
				StopLoss:        50,
				TakeProfit:      200,
			},
			accountEquity: 100,
			maxLeverage:   5,
			maxPosRatio:   2.0,
			wantLeverage:  0,
			wantError:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateDecision(&tt.decision, tt.accountEquity, tt.maxLeverage, tt.maxPosRatio)

			// Check error status
			if (err != nil) != tt.wantError {
				t.Errorf("validateDecision() error = %v, wantError %v", err, tt.wantError)
				return
			}

			// If shouldn't error, check if leverage was correctly corrected
			if !tt.wantError && tt.decision.Leverage != tt.wantLeverage {
				t.Errorf("Leverage not corrected: got %d, want %d", tt.decision.Leverage, tt.wantLeverage)
			}
		})
	}
}

// TestUpdateStopLossValidation verifies the update_stop_loss action passes
// validation only when at least one absolute price is provided.
func TestUpdateStopLossValidation(t *testing.T) {
	tests := []struct {
		name      string
		decision  Decision
		wantError bool
	}{
		{
			name:      "stop loss only - valid",
			decision:  Decision{Symbol: "ZECUSDT", Action: "update_stop_loss", StopLoss: 1390},
			wantError: false,
		},
		{
			name:      "take profit only - valid",
			decision:  Decision{Symbol: "ZECUSDT", Action: "update_stop_loss", TakeProfit: 1358},
			wantError: false,
		},
		{
			name:      "both prices - valid",
			decision:  Decision{Symbol: "ZECUSDT", Action: "update_stop_loss", StopLoss: 1390, TakeProfit: 1358},
			wantError: false,
		},
		{
			name:      "no prices - rejected",
			decision:  Decision{Symbol: "ZECUSDT", Action: "update_stop_loss"},
			wantError: true,
		},
		{
			name:      "unknown action - rejected",
			decision:  Decision{Symbol: "ZECUSDT", Action: "move_stop", StopLoss: 1390},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateDecision(&tt.decision, 100, 10, 1.5)
			if (err != nil) != tt.wantError {
				t.Errorf("validateDecision() error = %v, wantError %v", err, tt.wantError)
			}
		})
	}
}

// contains checks if string contains substring (helper function)
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		(len(s) > 0 && len(substr) > 0 && stringContains(s, substr)))
}

func stringContains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
