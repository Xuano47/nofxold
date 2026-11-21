package syncctl

import "testing"

func TestStopIfGenDoesNotKillNewerGeneration(t *testing.T) {
	const id = "test-trader-gen"
	Stop(id)
	defer Stop(id)

	ctx1 := Start(id)
	gen1 := CurrentGen(id)
	if gen1 == 0 {
		t.Fatal("expected non-zero gen1")
	}

	ctx2 := Start(id)
	gen2 := CurrentGen(id)
	if gen2 <= gen1 {
		t.Fatalf("expected gen2 > gen1, got gen1=%d gen2=%d", gen1, gen2)
	}

	// ctx1 should already be cancelled when ctx2 started
	select {
	case <-ctx1.Done():
	default:
		t.Fatal("expected ctx1 to be cancelled by Start(id) for ctx2")
	}

	// Delayed StopIfGen from instance 1 must NOT cancel ctx2
	if StopIfGen(id, gen1) {
		t.Fatal("StopIfGen(gen1) must return false when gen2 is active")
	}
	select {
	case <-ctx2.Done():
		t.Fatal("ctx2 must remain active after stale StopIfGen(gen1)")
	default:
	}

	// Matching StopIfGen(gen2) cancels ctx2
	if !StopIfGen(id, gen2) {
		t.Fatal("expected StopIfGen(gen2) to succeed")
	}
	select {
	case <-ctx2.Done():
	default:
		t.Fatal("expected ctx2 to be cancelled after StopIfGen(gen2)")
	}
}
