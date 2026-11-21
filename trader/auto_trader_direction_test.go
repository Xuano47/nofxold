package trader

import (
	"nofx/trader/types"
	"testing"
)

// mockTraderForDirection implements Trader interface minimally for position queries
type mockTraderForDirection struct {
	types.Trader
	positions []map[string]interface{}
}

func (m *mockTraderForDirection) GetPositions() ([]map[string]interface{}, error) {
	return m.positions, nil
}

func TestAutoCorrectCloseDirection(t *testing.T) {
	tests := []struct {
		name          string
		positions     []map[string]interface{}
		symbol        string
		requestedSide string
		wantCorrect   bool
	}{
		{
			name: "holding SHORT only, received close_long -> should auto-correct",
			positions: []map[string]interface{}{
				{"symbol": "DOGEUSDT", "side": "short", "positionAmt": -100.0},
			},
			symbol:        "DOGEUSDT",
			requestedSide: "long",
			wantCorrect:   true,
		},
		{
			name: "holding LONG only, received close_short -> should auto-correct",
			positions: []map[string]interface{}{
				{"symbol": "ETHUSDT", "side": "long", "positionAmt": 1.5},
			},
			symbol:        "ETHUSDT",
			requestedSide: "short",
			wantCorrect:   true,
		},
		{
			name: "holding LONG only, received close_long -> matching direction, no correction",
			positions: []map[string]interface{}{
				{"symbol": "BTCUSDT", "side": "long", "positionAmt": 0.1},
			},
			symbol:        "BTCUSDT",
			requestedSide: "long",
			wantCorrect:   false,
		},
		{
			name: "holding SHORT only, received close_short -> matching direction, no correction",
			positions: []map[string]interface{}{
				{"symbol": "SOLUSDT", "side": "short", "positionAmt": -10.0},
			},
			symbol:        "SOLUSDT",
			requestedSide: "short",
			wantCorrect:   false,
		},
		{
			name:          "no positions held, received close_long -> cannot correct",
			positions:     []map[string]interface{}{},
			symbol:        "DOGEUSDT",
			requestedSide: "long",
			wantCorrect:   false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			at := &AutoTrader{
				trader: &mockTraderForDirection{positions: tc.positions},
			}
			got := at.shouldAutoCorrectCloseDirection(tc.symbol, tc.requestedSide)
			if got != tc.wantCorrect {
				t.Errorf("shouldAutoCorrectCloseDirection(%s, %s) = %v, want %v", tc.symbol, tc.requestedSide, got, tc.wantCorrect)
			}
		})
	}
}

func TestResolveGenericCloseAction(t *testing.T) {
	tests := []struct {
		name       string
		positions  []map[string]interface{}
		symbol     string
		wantAction string
	}{
		{
			name: "holding SHORT -> resolves to close_short",
			positions: []map[string]interface{}{
				{"symbol": "DOGEUSDT", "side": "short", "positionAmt": -500.0},
			},
			symbol:     "DOGEUSDT",
			wantAction: "close_short",
		},
		{
			name: "holding LONG -> resolves to close_long",
			positions: []map[string]interface{}{
				{"symbol": "BTCUSDT", "side": "long", "positionAmt": 0.5},
			},
			symbol:     "BTCUSDT",
			wantAction: "close_long",
		},
		{
			name:       "no position -> resolves to empty",
			positions:  []map[string]interface{}{},
			symbol:     "SOLUSDT",
			wantAction: "",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			at := &AutoTrader{
				trader: &mockTraderForDirection{positions: tc.positions},
			}
			got := at.resolveGenericCloseAction(tc.symbol)
			if got != tc.wantAction {
				t.Errorf("resolveGenericCloseAction(%s) = %q, want %q", tc.symbol, got, tc.wantAction)
			}
		})
	}
}
