package kernel

import (
	"fmt"
	"nofx/store"
	"strings"
	"testing"
)

// TestLeveragePromptFlow verifies the end-to-end flow from RiskControlConfig to BuildSystemPrompt
func TestLeveragePromptFlow(t *testing.T) {
	config := store.StrategyConfig{
		Language: "en",
		RiskControl: store.RiskControlConfig{
			MaxPositions:          3,
			MaxLeverage:           8,
			MaxPositionValueRatio: 2.5,
			MaxMarginUsage:        0.8,
			MinPositionSize:       15,
			MinRiskRewardRatio:    3.0,
			MinConfidence:         80,
		},
	}

	engine := NewStrategyEngine(&config)
	equity := 1000.0
	prompt := engine.BuildSystemPrompt(equity, "balanced")

	// 1. Verify unified leverage instruction
	expectedLeverageLine := "- Trading Leverage: max 8x"
	if !strings.Contains(prompt, expectedLeverageLine) {
		t.Errorf("BuildSystemPrompt missing expected leverage instruction: %q", expectedLeverageLine)
	}

	// 2. Verify unified position value limit
	expectedPosLimit := fmt.Sprintf("- Position Value Limit: max %.0f USDT per coin (= equity %.0f × %.1f, a position-value multiple, NOT leverage)",
		equity*2.5, equity, 2.5)
	if !strings.Contains(prompt, expectedPosLimit) {
		t.Errorf("BuildSystemPrompt missing expected position limit: %q", expectedPosLimit)
	}

	// 3. Verify JSON example has matching leverage and position size
	expectedExampleLev := "\"leverage\": 8"
	if !strings.Contains(prompt, expectedExampleLev) {
		t.Errorf("BuildSystemPrompt JSON example missing leverage 8: %q", prompt)
	}

	expectedExampleSize := fmt.Sprintf("\"position_size_usd\": %.0f", equity*2.5)
	if !strings.Contains(prompt, expectedExampleSize) {
		t.Errorf("BuildSystemPrompt JSON example missing position size %.0f", equity*2.5)
	}

	// 4. Verify no old bifurcated strings remain
	if strings.Contains(prompt, "Altcoins max") || strings.Contains(prompt, "BTC/ETH max") {
		t.Errorf("BuildSystemPrompt should not contain legacy bifurcated leverage strings")
	}
}

// TestLeverageValidationFlow verifies validateDecision uses unified maxLeverage and maxPosRatio
func TestLeverageValidationFlow(t *testing.T) {
	equity := 1000.0
	maxLev := 8
	maxPosRatio := 2.5 // Max 2500 USDT

	// Valid decision: within limits
	validDecision := Decision{
		Symbol:          "SOLUSDT",
		Action:          "open_long",
		Leverage:        8,
		PositionSizeUSD: 2000,
		StopLoss:        150,
		TakeProfit:      200,
	}
	if err := validateDecision(&validDecision, equity, maxLev, maxPosRatio); err != nil {
		t.Fatalf("Expected valid decision to pass, got error: %v", err)
	}
	if validDecision.Leverage != 8 {
		t.Errorf("Expected leverage 8, got %d", validDecision.Leverage)
	}

	// Exceeded leverage: should auto-adjust down to maxLev
	highLevDecision := Decision{
		Symbol:          "SOLUSDT",
		Action:          "open_long",
		Leverage:        15,
		PositionSizeUSD: 2000,
		StopLoss:        150,
		TakeProfit:      200,
	}
	if err := validateDecision(&highLevDecision, equity, maxLev, maxPosRatio); err != nil {
		t.Fatalf("Expected high leverage to be auto-corrected without error, got: %v", err)
	}
	if highLevDecision.Leverage != 8 {
		t.Errorf("Expected leverage auto-corrected to 8, got %d", highLevDecision.Leverage)
	}

	// Exceeded position size: should be rejected
	oversizedDecision := Decision{
		Symbol:          "SOLUSDT",
		Action:          "open_long",
		Leverage:        8,
		PositionSizeUSD: 3000, // Exceeds 2500
		StopLoss:        150,
		TakeProfit:      200,
	}
	if err := validateDecision(&oversizedDecision, equity, maxLev, maxPosRatio); err == nil {
		t.Fatalf("Expected oversized position size to be rejected, but passed")
	}
}

// TestLegacyConfigFallback verifies backward compatibility for legacy configs
func TestLegacyConfigFallback(t *testing.T) {
	legacyConfig := store.RiskControlConfig{
		AltcoinMaxLeverage:           6,
		AltcoinMaxPositionValueRatio: 1.8,
	}

	if lev := legacyConfig.GetMaxLeverage(); lev != 6 {
		t.Errorf("GetMaxLeverage expected 6 from AltcoinMaxLeverage, got %d", lev)
	}
	if ratio := legacyConfig.GetMaxPositionValueRatio(); ratio != 1.8 {
		t.Errorf("GetMaxPositionValueRatio expected 1.8, got %f", ratio)
	}
}
