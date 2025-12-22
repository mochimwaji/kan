/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useVisualState } from "./useVisualState";

describe("useVisualState", () => {
  it("initializes with server data", () => {
    const serverData = { items: [1, 2, 3] };
    const { result } = renderHook(() => useVisualState(serverData));

    expect(result.current.visualData).toEqual(serverData);
    expect(result.current.isFrozen).toBe(false);
  });

  it("syncs with server data when not frozen", () => {
    const initialData = { items: [1, 2, 3] };
    const { result, rerender } = renderHook(
      ({ data }: { data: { items: number[] } }) => useVisualState(data),
      { initialProps: { data: initialData } },
    );

    const updatedData = { items: [4, 5, 6] };
    rerender({ data: updatedData });

    expect(result.current.visualData).toEqual(updatedData);
  });

  it("ignores server data changes when frozen", () => {
    const initialData = { items: [1, 2, 3] };
    const { result, rerender } = renderHook(
      ({ data }: { data: { items: number[] } }) => useVisualState(data),
      { initialProps: { data: initialData } },
    );

    // Freeze the state
    act(() => {
      result.current.freeze();
    });

    expect(result.current.isFrozen).toBe(true);

    // Server data changes
    const updatedData = { items: [4, 5, 6] };
    rerender({ data: updatedData });

    // Visual data should NOT have changed
    expect(result.current.visualData).toEqual(initialData);
  });

  it("allows local updates when frozen", () => {
    const initialData = { items: [1, 2, 3] };
    const { result } = renderHook(() => useVisualState(initialData));

    act(() => {
      result.current.freeze();
    });

    const localUpdate = { items: [3, 2, 1] };
    act(() => {
      result.current.setVisualData(localUpdate);
    });

    expect(result.current.visualData).toEqual(localUpdate);
  });

  it("syncs with server data on unfreeze", () => {
    const initialData = { items: [1, 2, 3] };
    const { result, rerender } = renderHook(
      ({ data }: { data: { items: number[] } }) => useVisualState(data),
      { initialProps: { data: initialData } },
    );

    act(() => {
      result.current.freeze();
    });

    // Server data changes while frozen
    const serverUpdate = { items: [7, 8, 9] };
    rerender({ data: serverUpdate });

    // Make local changes
    act(() => {
      result.current.setVisualData({ items: [3, 2, 1] });
    });

    // Unfreeze - should sync with latest server data
    act(() => {
      result.current.unfreeze();
    });

    expect(result.current.isFrozen).toBe(false);
    // After unfreeze, next render cycle will sync
    rerender({ data: serverUpdate });
    expect(result.current.visualData).toEqual(serverUpdate);
  });

  it("discards local changes when unfreeze with discardLocal option", () => {
    const initialData = { items: [1, 2, 3] };
    const { result, rerender } = renderHook(
      ({ data }: { data: { items: number[] } }) => useVisualState(data),
      { initialProps: { data: initialData } },
    );

    act(() => {
      result.current.freeze();
    });

    // Server data changes while frozen
    const serverUpdate = { items: [7, 8, 9] };
    rerender({ data: serverUpdate });

    // Make local changes
    act(() => {
      result.current.setVisualData({ items: [3, 2, 1] });
    });

    // Unfreeze with discard - should immediately sync
    act(() => {
      result.current.unfreeze({ discardLocal: true });
    });

    expect(result.current.visualData).toEqual(serverUpdate);
  });
});
