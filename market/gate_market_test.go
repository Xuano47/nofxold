package market

import (
	"os"
	"testing"
)

func TestToGateContract(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"BTCUSDT", "BTC_USDT"},
		{"btc", "BTC_USDT"},
		{"ethusdt", "ETH_USDT"},
		{"SOL_USDT", "SOL_USDT"},
	}
	for _, tc := range cases {
		if got := toGateContract(tc.in); got != tc.want {
			t.Errorf("toGateContract(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestToGateInterval(t *testing.T) {
	cases := []struct {
		tf     string
		iv     string
		durMs  int64
		hasErr bool
	}{
		{"5m", "5m", 5 * 60 * 1000, false},
		{"15m", "15m", 15 * 60 * 1000, false},
		{"1h", "1h", 60 * 60 * 1000, false},
		{"4h", "4h", 4 * 60 * 60 * 1000, false},
		{"1d", "1d", 24 * 60 * 60 * 1000, false},
		{"3m", "", 0, true},
		{"2h", "", 0, true},
	}
	for _, tc := range cases {
		iv, durMs, err := toGateInterval(tc.tf)
		if (err != nil) != tc.hasErr {
			t.Errorf("toGateInterval(%q) err=%v, hasErr=%v", tc.tf, err, tc.hasErr)
			continue
		}
		if !tc.hasErr && (iv != tc.iv || durMs != tc.durMs) {
			t.Errorf("toGateInterval(%q) = (%q, %d), want (%q, %d)", tc.tf, iv, durMs, tc.iv, tc.durMs)
		}
	}
}

func TestParseGateCandles(t *testing.T) {
	rows := []gateCandlestickRow{
		{T: 1700000000, V: 100, O: "100", H: "106", L: "99", C: "105", Sum: "210"},
		{T: 1700000900, V: 200, O: "105", H: "110", L: "104", C: "108", Sum: "324"},
	}
	klines, err := parseGateCandles(rows, 900000, "BTCUSDT")
	if err != nil {
		t.Fatalf("parseGateCandles failed: %v", err)
	}
	if len(klines) != 2 {
		t.Fatalf("expected 2 klines, got %d", len(klines))
	}
	if klines[0].OpenTime != 1700000000000 || klines[1].OpenTime != 1700000900000 {
		t.Fatalf("unexpected OpenTime order: %d then %d", klines[0].OpenTime, klines[1].OpenTime)
	}
	if klines[0].QuoteVolume != 210 || klines[0].Volume != 2.0 {
		t.Errorf("unexpected volume on first candle: vol=%v quote=%v", klines[0].Volume, klines[0].QuoteVolume)
	}
}

func TestGateUnlistedCache(t *testing.T) {
	sym := "NONEXISTENTGATETESTUSDT"
	if isGateUnlisted(sym) {
		t.Fatal("symbol should not be marked unlisted initially")
	}
	markGateUnlisted(sym)
	if !isGateUnlisted(sym) {
		t.Fatal("symbol should be marked unlisted after markGateUnlisted")
	}
}

func TestGetGateMarketLive(t *testing.T) {
	if os.Getenv("NOFX_LIVE_TEST") != "1" {
		t.Skip("set NOFX_LIVE_TEST=1 to run live Gate market smoke test")
	}
	klines, err := getKlinesFromGate("BTCUSDT", "15m", 5)
	if err != nil {
		t.Fatalf("getKlinesFromGate failed: %v", err)
	}
	if len(klines) != 5 {
		t.Fatalf("expected 5 klines, got %d", len(klines))
	}
	rate, nextMs, err := fetchCurrentFundingRateGate("BTCUSDT")
	if err != nil || nextMs <= 0 {
		t.Fatalf("fetchCurrentFundingRateGate failed: rate=%v nextMs=%d err=%v", rate, nextMs, err)
	}
	oi, err := getOpenInterestDataGate("BTCUSDT")
	if err != nil || oi.Latest <= 0 {
		t.Fatalf("getOpenInterestDataGate failed: oi=%+v err=%v", oi, err)
	}
}
