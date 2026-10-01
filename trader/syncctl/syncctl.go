// Package syncctl tracks running exchange order-sync goroutines so they can be
// cancelled when a trader is stopped or removed.
//
// Every exchange's StartOrderSync registers a context here; its sync loop exits
// when that context is cancelled. Without this, each trader (re)creation leaks a
// permanent goroutine that keeps polling the exchange forever. Those stale
// goroutines write trades under their own outdated trader ID, so a position can
// be opened under one ID and closed under another, silently dropping the close
// record (and the closed-position history that depends on it).
package syncctl

import (
	"context"
	"sync"
)

var (
	mu      sync.Mutex
	cancels = make(map[string]context.CancelFunc)
)

// Start registers a new sync context for traderID and cancels any previous one,
// so recreating a trader never leaves two syncers racing for the same account.
// The returned context is cancelled by Stop(traderID) or by a later Start call
// for the same traderID.
func Start(traderID string) context.Context {
	mu.Lock()
	defer mu.Unlock()

	if cancel, ok := cancels[traderID]; ok {
		cancel()
		delete(cancels, traderID)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancels[traderID] = cancel
	return ctx
}

// Stop cancels the sync context registered for traderID, if any.
func Stop(traderID string) {
	mu.Lock()
	defer mu.Unlock()

	if cancel, ok := cancels[traderID]; ok {
		cancel()
		delete(cancels, traderID)
	}
}
