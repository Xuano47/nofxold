package trader

import (
	"fmt"
	"nofx/logger"
	"nofx/market"
	"strings"
)

// positionCacheInvalidator is implemented by exchange traders that keep a
// short-lived position cache. The protection checks below always verify
// against fresh exchange data, so the cache is invalidated first.
type positionCacheInvalidator interface {
	InvalidatePositionCache()
}

// usesSignalManagedExit keeps ordinary profit-taking under the direction
// state machine. The free build never draws from the paid signal source, so
// this is effectively always false here; the hook is kept so the open logic
// stays faithful to the upstream implementation.
func (at *AutoTrader) usesSignalManagedExit() bool {
	return at.usesVergexSignalPolicy()
}

// validateProtectionPrices rejects opens whose stop loss / take profit would be
// placed on the wrong side of the market, before any exposure is created.
func validateProtectionPrices(action string, marketPrice, stopLoss, takeProfit float64, signalManaged bool) error {
	if marketPrice <= 0 || stopLoss <= 0 {
		return fmt.Errorf("market price and stop loss must be positive")
	}
	switch action {
	case "open_long":
		if stopLoss >= marketPrice {
			return fmt.Errorf("long stop loss %.8f must be below market price %.8f", stopLoss, marketPrice)
		}
		// A missing take profit (0) is allowed — the prompt only recommends one.
		// A provided take profit must sit above the market.
		if !signalManaged && takeProfit != 0 && takeProfit <= marketPrice {
			return fmt.Errorf("long take profit %.8f must be above market price %.8f", takeProfit, marketPrice)
		}
	case "open_short":
		if stopLoss <= marketPrice {
			return fmt.Errorf("short stop loss %.8f must be above market price %.8f", stopLoss, marketPrice)
		}
		// A missing take profit (0) is allowed; a provided one must be positive
		// and below the market.
		if !signalManaged && takeProfit != 0 && (takeProfit < 0 || takeProfit >= marketPrice) {
			return fmt.Errorf("short take profit %.8f must be positive and below market price %.8f", takeProfit, marketPrice)
		}
	default:
		return fmt.Errorf("unsupported open action %q", action)
	}
	if signalManaged && takeProfit != 0 {
		return fmt.Errorf("signal-managed take profit must be 0")
	}
	return nil
}

// closeUnprotectedPosition closes a position that was opened without valid
// exchange-side protection, so an unprotected exposure never lingers.
func (at *AutoTrader) closeUnprotectedPosition(symbol, side string, quantity float64, protectionErr error) error {
	logger.Infof("  🚨 %v; emergency-closing %s %s", protectionErr, symbol, side)
	if closeErr := at.emergencyClosePositionAndVerify(symbol, side, quantity); closeErr != nil {
		return fmt.Errorf("%w; emergency close failed: %v", protectionErr, closeErr)
	}
	return fmt.Errorf("%w; opened position was emergency-closed", protectionErr)
}

// emergencyClosePositionAndVerify closes a position and confirms the exchange
// reports it flat, retrying a few times and cleaning up leftover protection
// orders. It never assumes the close succeeded just because the API returned OK.
func (at *AutoTrader) emergencyClosePositionAndVerify(symbol, side string, quantity float64) error {
	var lastErr error
	for attempt := 1; attempt <= 3; attempt++ {
		var err error
		if side == "long" {
			_, err = at.trader.CloseLong(symbol, quantity)
		} else if side == "short" {
			_, err = at.trader.CloseShort(symbol, quantity)
		} else {
			return fmt.Errorf("unknown position direction: %s", side)
		}
		if err != nil {
			lastErr = err
			continue
		}

		positions, err := getFreshPositions(at.trader)
		if err != nil {
			lastErr = fmt.Errorf("verify flat position: %w", err)
			continue
		}

		residual := false
		for _, pos := range positions {
			if market.Normalize(fmt.Sprint(pos["symbol"])) == market.Normalize(symbol) &&
				strings.EqualFold(fmt.Sprint(pos["side"]), side) {
				residual = true
				break
			}
		}
		if residual {
			lastErr = fmt.Errorf("residual %s position remains after close attempt %d", side, attempt)
			continue
		}

		if err := at.trader.CancelAllOrders(symbol); err != nil {
			return fmt.Errorf("position is flat but protection-order cleanup failed: %w", err)
		}
		openOrders, err := at.trader.GetOpenOrders(symbol)
		if err != nil {
			return fmt.Errorf("position is flat but protection-order verification failed: %w", err)
		}
		if len(openOrders) != 0 {
			return fmt.Errorf("position is flat but %d open orders remain for %s", len(openOrders), symbol)
		}
		return nil
	}
	return lastErr
}

// getFreshPositions invalidates any exchange-side position cache before reading
// positions, so verification never reads a stale snapshot.
func getFreshPositions(tr Trader) ([]map[string]interface{}, error) {
	if invalidator, ok := tr.(positionCacheInvalidator); ok {
		invalidator.InvalidatePositionCache()
	}
	return tr.GetPositions()
}
