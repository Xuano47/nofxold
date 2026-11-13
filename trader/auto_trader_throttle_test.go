package trader

import (
	"strings"
	"testing"
	"time"

	"nofx/kernel"
	"nofx/store"
)

func TestReentryCooldownConfig(t *testing.T) {
	// 1. nil trader uses fallback default
	var nilTrader *AutoTrader
	if nilTrader.reentryCooldown() != 15*time.Minute {
		t.Errorf("Expected 15m for nil trader, got %v", nilTrader.reentryCooldown())
	}

	// 2. Unset/nil cooldown in strategy defaults to 15m
	at := &AutoTrader{
		config: AutoTraderConfig{
			StrategyConfig: &store.StrategyConfig{
				RiskControl: store.RiskControlConfig{
					ReentryCooldownMinutes: nil,
				},
			},
		},
	}
	if at.reentryCooldown() != 15*time.Minute {
		t.Errorf("Expected default 15m, got %v", at.reentryCooldown())
	}

	// 3. Custom cooldown (30m)
	thirty := 30
	at.config.StrategyConfig.RiskControl.ReentryCooldownMinutes = &thirty
	if at.reentryCooldown() != 30*time.Minute {
		t.Errorf("Expected 30m, got %v", at.reentryCooldown())
	}

	// 4. Disabled cooldown (0m)
	zero := 0
	at.config.StrategyConfig.RiskControl.ReentryCooldownMinutes = &zero
	if at.reentryCooldown() != 0 {
		t.Errorf("Expected 0 (disabled), got %v", at.reentryCooldown())
	}
}

func TestOpenThrottleReason_CooldownDisabled(t *testing.T) {
	zero := 0
	at := &AutoTrader{
		config: AutoTraderConfig{
			StrategyConfig: &store.StrategyConfig{
				RiskControl: store.RiskControlConfig{
					ReentryCooldownMinutes: &zero,
				},
			},
		},
	}

	ctx := &kernel.Context{}

	// When cooldown is 0, same direction re-entry in closedThisCycle is NOT throttled
	closedThisCycle := map[string]string{
		"BTCUSDT": "long",
	}
	openDecision := kernel.Decision{
		Symbol: "BTCUSDT",
		Action: "open_long",
	}

	reason := at.openThrottleReason(openDecision, ctx, closedThisCycle)
	if reason != "" {
		t.Errorf("Expected no throttle when cooldown is disabled, got %q", reason)
	}

	// But if position already exists in context, it must still be throttled to prevent duplicate opening
	ctx.Positions = []kernel.PositionInfo{
		{Symbol: "BTCUSDT", Side: "long"},
	}
	reason = at.openThrottleReason(openDecision, ctx, closedThisCycle)
	if !strings.Contains(reason, "already has an open long position") {
		t.Errorf("Expected existing position throttle, got %q", reason)
	}
}

func TestOpenThrottleReason_CooldownEnabled(t *testing.T) {
	fifteen := 15
	at := &AutoTrader{
		config: AutoTraderConfig{
			StrategyConfig: &store.StrategyConfig{
				RiskControl: store.RiskControlConfig{
					ReentryCooldownMinutes: &fifteen,
				},
			},
		},
	}

	ctx := &kernel.Context{}

	// 1. Same side closed this cycle -> throttled
	closedThisCycle := map[string]string{
		"BTCUSDT": "long",
	}
	openLong := kernel.Decision{
		Symbol: "BTCUSDT",
		Action: "open_long",
	}
	reason := at.openThrottleReason(openLong, ctx, closedThisCycle)
	if !strings.Contains(reason, "was closed this cycle; wait") || !strings.Contains(reason, "before re-entry") {
		t.Errorf("Expected same-side cooldown throttle, got %q", reason)
	}

	// 2. Opposite side closed this cycle (reversal) -> NOT throttled
	openShort := kernel.Decision{
		Symbol: "BTCUSDT",
		Action: "open_short",
	}
	reasonReversal := at.openThrottleReason(openShort, ctx, closedThisCycle)
	if reasonReversal != "" {
		t.Errorf("Expected reversal to be allowed, got throttle: %q", reasonReversal)
	}
}
