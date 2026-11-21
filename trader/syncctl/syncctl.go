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

type entry struct {
	cancel context.CancelFunc
	gen    uint64
}

var (
	mu      sync.Mutex
	entries = make(map[string]entry)
	nextGen uint64
)

// Start registers a new sync context for traderID and cancels any previous one,
// so recreating a trader never leaves two syncers racing for the same account.
// The returned context is cancelled by Stop(traderID), StopIfGen, or by a later
// Start call for the same traderID.
func Start(traderID string) context.Context {
	mu.Lock()
	defer mu.Unlock()

	if prev, ok := entries[traderID]; ok {
		prev.cancel()
		delete(entries, traderID)
	}

	nextGen++
	ctx, cancel := context.WithCancel(context.Background())
	entries[traderID] = entry{cancel: cancel, gen: nextGen}
	return ctx
}

// CurrentGen returns the active generation token for traderID (0 if none).
func CurrentGen(traderID string) uint64 {
	mu.Lock()
	defer mu.Unlock()
	if e, ok := entries[traderID]; ok {
		return e.gen
	}
	return 0
}

// Stop cancels the sync context registered for traderID, if any.
func Stop(traderID string) {
	mu.Lock()
	defer mu.Unlock()

	if prev, ok := entries[traderID]; ok {
		prev.cancel()
		delete(entries, traderID)
	}
}

// StopIfGen cancels the sync context only if its generation matches gen,
// preventing a delayed Stop() from an older trader instance from killing a newer instance's OrderSync.
func StopIfGen(traderID string, gen uint64) bool {
	if gen == 0 {
		return false
	}
	mu.Lock()
	defer mu.Unlock()

	if prev, ok := entries[traderID]; ok && prev.gen == gen {
		prev.cancel()
		delete(entries, traderID)
		return true
	}
	return false
}
