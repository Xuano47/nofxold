package market

import (
	"encoding/json"
	"os"
	"testing"
)

// Real fapi/v1/klines response captured 2026-10-01 09:47 UTC (BTCUSDT 5m).
const binanceKlineFixture = `[
[1790847300000,"83775.70","83808.30","83757.10","83808.30","228.514",1790847599999,"19145702.93500",5664,"105.625","8849341.93030","0"],
[1790847600000,"83808.20","83845.00","83796.00","83844.80","270.038",1790847899999,"22635428.24540",4539,"134.747","11294689.60020","0"],
[1790847900000,"83844.90","83844.90","83796.60","83830.20","194.978",1790848199999,"16343475.33610",3424,"56.874","4767367.72410","0"]
]`

func TestParseKlineFromBinanceFixture(t *testing.T) {
	var rows []KlineResponse
	if err := json.Unmarshal([]byte(binanceKlineFixture), &rows); err != nil {
		t.Fatalf("fixture unmarshal failed: %v", err)
	}
	if len(rows) != 3 {
		t.Fatalf("expected 3 rows, got %d", len(rows))
	}

	k, err := parseKline(rows[0])
	if err != nil {
		t.Fatalf("parseKline failed: %v", err)
	}
	if k.OpenTime != 1790847300000 || k.CloseTime != 1790847599999 {
		t.Errorf("unexpected times: open=%d close=%d", k.OpenTime, k.CloseTime)
	}
	if k.Open != 83775.70 || k.High != 83808.30 || k.Low != 83757.10 || k.Close != 83808.30 {
		t.Errorf("unexpected OHLC: %+v", k)
	}
	if k.Volume != 228.514 {
		t.Errorf("unexpected volume: %v", k.Volume)
	}
	if k.QuoteVolume != 19145702.935 {
		t.Errorf("unexpected quote volume: %v", k.QuoteVolume)
	}
	if k.Trades != 5664 {
		t.Errorf("unexpected trades: %v", k.Trades)
	}
	if k.TakerBuyBaseVolume != 105.625 || k.TakerBuyQuoteVolume != 8849341.93030 {
		t.Errorf("unexpected taker buy volumes: %v / %v", k.TakerBuyBaseVolume, k.TakerBuyQuoteVolume)
	}

	// In-progress candles must not be zeroed (the whole point of direct access).
	last, err := parseKline(rows[2])
	if err != nil {
		t.Fatalf("parseKline(last) failed: %v", err)
	}
	if last.Volume <= 0 {
		t.Errorf("in-progress candle volume should be > 0, got %v", last.Volume)
	}
}

// Numeric-encoded fields (not strings) must parse instead of panicking.
func TestParseKlineNumericEncoded(t *testing.T) {
	row := KlineResponse{
		float64(1790847900000), float64(83844.90), float64(83844.90), float64(83796.60),
		float64(83843.80), float64(229.210), float64(1790848199999), float64(19213465.7512),
		float64(4034), float64(71.004), float64(5952025.3454),
	}
	k, err := parseKline(row)
	if err != nil {
		t.Fatalf("parseKline failed for numeric encoding: %v", err)
	}
	if k.Close != 83843.80 || k.Trades != 4034 {
		t.Errorf("unexpected parsed values: %+v", k)
	}
}

func TestParseKlineShortRow(t *testing.T) {
	if _, err := parseKline(KlineResponse{float64(1), float64(2)}); err == nil {
		t.Fatal("expected error for short row, got nil")
	}
}

func TestParseBinanceErrorCode(t *testing.T) {
	code, msg, ok := parseBinanceErrorCode([]byte(`{"code":-1121,"msg":"Invalid symbol."}`))
	if !ok || code != -1121 || msg != "Invalid symbol." {
		t.Errorf("unexpected parse result: %d %q %v", code, msg, ok)
	}

	for _, body := range []string{`[]`, `{"foo":1}`, `{"code":0,"msg":""}`, `not json`} {
		if _, _, ok := parseBinanceErrorCode([]byte(body)); ok {
			t.Errorf("expected no error code for body %q", body)
		}
	}
}

func TestBinanceUnlistedCache(t *testing.T) {
	const sym = "ZZZTESTNOTLISTEDUSDT"
	if isBinanceUnlisted(sym) {
		t.Fatal("symbol should not be marked unlisted initially")
	}
	markBinanceUnlisted(sym)
	if !isBinanceUnlisted(sym) {
		t.Fatal("symbol should be marked unlisted after markBinanceUnlisted")
	}
	unlistedSymbolCache.Delete(sym) // keep the cache clean for other tests
}

// Live smoke test against the real Binance API; opt in with NOFX_LIVE_TEST=1.
func TestGetKlinesFromBinanceLive(t *testing.T) {
	if os.Getenv("NOFX_LIVE_TEST") == "" {
		t.Skip("set NOFX_LIVE_TEST=1 to run the live Binance smoke test")
	}
	klines, err := getKlinesFromBinance("BTCUSDT", "5m", 3)
	if err != nil {
		t.Fatalf("live fetch failed: %v", err)
	}
	if len(klines) != 3 {
		t.Fatalf("expected 3 klines, got %d", len(klines))
	}
	last := klines[len(klines)-1]
	if last.OpenTime <= 0 || last.Close <= 0 {
		t.Errorf("unexpected last kline: %+v", last)
	}
	if last.CloseTime <= last.OpenTime {
		t.Errorf("closeTime should be after openTime: %+v", last)
	}
	t.Logf("last kline: openTime=%d close=%.2f volume=%.3f trades=%d",
		last.OpenTime, last.Close, last.Volume, last.Trades)
}
