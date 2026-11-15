package market

import (
	"os"
	"testing"
)

func TestToOKXInstID(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"BTCUSDT", "BTC-USDT-SWAP"},
		{"btc", "BTC-USDT-SWAP"},
		{"ethusdt", "ETH-USDT-SWAP"},
		{"SOL-USDT-SWAP", "SOL-USDT-SWAP"},
	}
	for _, tc := range cases {
		if got := toOKXInstID(tc.in); got != tc.want {
			t.Errorf("toOKXInstID(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestToOKXBar(t *testing.T) {
	cases := []struct {
		tf     string
		bar    string
		durMs  int64
		hasErr bool
	}{
		{"3m", "3m", 3 * 60 * 1000, false},
		{"15m", "15m", 15 * 60 * 1000, false},
		{"1h", "1H", 60 * 60 * 1000, false},
		{"4h", "4H", 4 * 60 * 60 * 1000, false},
		{"1d", "1D", 24 * 60 * 60 * 1000, false},
		{"bad", "", 0, true},
	}
	for _, tc := range cases {
		bar, durMs, err := toOKXBar(tc.tf)
		if (err != nil) != tc.hasErr {
			t.Errorf("toOKXBar(%q) err=%v, hasErr=%v", tc.tf, err, tc.hasErr)
			continue
		}
		if !tc.hasErr && (bar != tc.bar || durMs != tc.durMs) {
			t.Errorf("toOKXBar(%q) = (%q, %d), want (%q, %d)", tc.tf, bar, durMs, tc.bar, tc.durMs)
		}
	}
}

func TestParseOKXCandlesChronological(t *testing.T) {
	// OKX returns newest candle first.
	rows := [][]string{
		{"1700000900000", "105", "110", "104", "108", "20", "2.0", "216.0", "0"},
		{"1700000000000", "100", "106", "99", "105", "10", "1.0", "103.0", "1"},
	}
	klines, err := parseOKXCandles(rows, 900000, "BTCUSDT")
	if err != nil {
		t.Fatalf("parseOKXCandles failed: %v", err)
	}
	if len(klines) != 2 {
		t.Fatalf("expected 2 klines, got %d", len(klines))
	}
	if klines[0].OpenTime != 1700000000000 || klines[1].OpenTime != 1700000900000 {
		t.Fatalf("expected ascending open times, got %d then %d", klines[0].OpenTime, klines[1].OpenTime)
	}
	if klines[0].Volume != 1.0 || klines[0].QuoteVolume != 103.0 {
		t.Errorf("unexpected volumes on first candle: vol=%v quote=%v", klines[0].Volume, klines[0].QuoteVolume)
	}
	if klines[0].CloseTime != 1700000000000+900000-1 {
		t.Errorf("unexpected CloseTime: %d", klines[0].CloseTime)
	}
}

func TestNormalizeMarketExchange(t *testing.T) {
	if got := normalizeMarketExchange("OKX"); got != "okx" {
		t.Errorf("got %q, want okx", got)
	}
	if got := normalizeMarketExchange(" okx "); got != "okx" {
		t.Errorf("got %q, want okx", got)
	}
	if got := normalizeMarketExchange(""); got != "binance" {
		t.Errorf("got %q, want binance", got)
	}
	if got := normalizeMarketExchange("Gate"); got != "gate" {
		t.Errorf("got %q, want gate", got)
	}
	if got := normalizeMarketExchange("binance"); got != "binance" {
		t.Errorf("got %q, want binance", got)
	}
}

func TestOKXUnlistedCache(t *testing.T) {
	sym := "NONEXISTENTOKXTESTUSDT"
	if isOKXUnlisted(sym) {
		t.Fatal("symbol should not be marked unlisted initially")
	}
	markOKXUnlisted(sym)
	if !isOKXUnlisted(sym) {
		t.Fatal("symbol should be marked unlisted after markOKXUnlisted")
	}
}

func TestGetOKXMarketLive(t *testing.T) {
	if os.Getenv("NOFX_LIVE_TEST") != "1" {
		t.Skip("set NOFX_LIVE_TEST=1 to run live OKX market smoke test")
	}
	klines, err := getKlinesFromOKX("BTCUSDT", "15m", 5)
	if err != nil {
		t.Fatalf("getKlinesFromOKX failed: %v", err)
	}
	if len(klines) != 5 {
		t.Fatalf("expected 5 klines, got %d", len(klines))
	}
	rate, nextMs, err := fetchCurrentFundingRateOKX("BTCUSDT")
	if err != nil || nextMs <= 0 {
		t.Fatalf("fetchCurrentFundingRateOKX failed: rate=%v nextMs=%d err=%v", rate, nextMs, err)
	}
	oi, err := getOpenInterestDataOKX("BTCUSDT")
	if err != nil || oi.Latest <= 0 {
		t.Fatalf("getOpenInterestDataOKX failed: oi=%+v err=%v", oi, err)
	}
}
