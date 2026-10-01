package syncctl

import (
	"testing"
	"time"
)

// TestStopCancelsContext verifies Stop actually cancels the registered context,
// which is what makes the exchange sync loop exit.
func TestStopCancelsContext(t *testing.T) {
	ctx := Start("trader-a")
	select {
	case <-ctx.Done():
		t.Fatal("context already cancelled before Stop")
	default:
	}

	Stop("trader-a")

	select {
	case <-ctx.Done():
	case <-time.After(time.Second):
		t.Fatal("Stop did not cancel the context")
	}
}

// TestStartCancelsPreviousForSameTrader ensures recreating a trader never
// leaves two syncers running against the same account.
func TestStartCancelsPreviousForSameTrader(t *testing.T) {
	first := Start("trader-b")
	second := Start("trader-b")

	select {
	case <-first.Done():
	case <-time.After(time.Second):
		t.Fatal("second Start did not cancel the previous context")
	}

	select {
	case <-second.Done():
		t.Fatal("second context was cancelled unexpectedly")
	default:
	}

	Stop("trader-b")
}

// TestStopUnknownTrader must not panic when nothing was registered.
func TestStopUnknownTrader(t *testing.T) {
	Stop("never-started")
}
