package trader

import "testing"

// TestFindProtectionPrices verifies effective stop-loss / take-profit selection
// from exchange open orders.
func TestFindProtectionPrices(t *testing.T) {
	tests := []struct {
		name   string
		orders []OpenOrder
		side   string
		wantSL float64
		wantTP float64
	}{
		{
			name: "long uses the highest stop (closest from below)",
			orders: []OpenOrder{
				{Symbol: "ZECUSDT", PositionSide: "LONG", Type: "STOP_MARKET", StopPrice: 1400},
				{Symbol: "ZECUSDT", PositionSide: "LONG", Type: "STOP_MARKET", StopPrice: 1413},
				{Symbol: "ZECUSDT", PositionSide: "LONG", Type: "TAKE_PROFIT_MARKET", StopPrice: 1358},
			},
			side:   "long",
			wantSL: 1413,
			wantTP: 1358,
		},
		{
			name: "short uses the lowest stop (closest from above) and highest TP",
			orders: []OpenOrder{
				{Symbol: "ZECUSDT", PositionSide: "SHORT", Type: "STOP_MARKET", StopPrice: 1430},
				{Symbol: "ZECUSDT", PositionSide: "SHORT", Type: "STOP_MARKET", StopPrice: 1420},
				{Symbol: "ZECUSDT", PositionSide: "SHORT", Type: "TAKE_PROFIT_MARKET", StopPrice: 1290},
				{Symbol: "ZECUSDT", PositionSide: "SHORT", Type: "TAKE_PROFIT_MARKET", StopPrice: 1300},
			},
			side:   "short",
			wantSL: 1420,
			wantTP: 1300,
		},
		{
			name: "BOTH/empty position side matches (one-way mode)",
			orders: []OpenOrder{
				{Symbol: "BTCUSDT", PositionSide: "BOTH", Type: "STOP_MARKET", StopPrice: 90000},
				{Symbol: "BTCUSDT", PositionSide: "", Type: "TAKE_PROFIT_MARKET", StopPrice: 110000},
			},
			side:   "long",
			wantSL: 90000,
			wantTP: 110000,
		},
		{
			name: "orders of the opposite side are ignored",
			orders: []OpenOrder{
				{Symbol: "ZECUSDT", PositionSide: "LONG", Type: "STOP_MARKET", StopPrice: 1413},
			},
			side:   "short",
			wantSL: 0,
			wantTP: 0,
		},
		{
			name: "non-conditional orders are ignored",
			orders: []OpenOrder{
				{Symbol: "ZECUSDT", PositionSide: "LONG", Type: "LIMIT", Price: 1400, StopPrice: 0},
			},
			side:   "long",
			wantSL: 0,
			wantTP: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sl, tp := findProtectionPrices(tt.orders, tt.side)
			if sl != tt.wantSL || tp != tt.wantTP {
				t.Errorf("findProtectionPrices() = (%.4f, %.4f), want (%.4f, %.4f)", sl, tp, tt.wantSL, tt.wantTP)
			}
		})
	}
}
