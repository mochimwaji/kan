/**
 * Factory functions for creating standardized tRPC mutation callbacks.
 *
 * These helpers reduce boilerplate for optimistic updates while keeping
 * the tRPC useMutation call visible and type-safe.
 *
 * @example
 * const deleteCallbacks = createOptimisticDelete({
 *   utils,
 *   getQueryKey: () => [['board', 'byId'], { boardPublicId }],
 *   filterFn: (data, input) => ({
 *     ...data,
 *     lists: data.lists.map(list => ({
 *       ...list,
 *       cards: list.cards.filter(c => c.publicId !== input.cardPublicId)
 *     }))
 *   }),
 *   onError: () => showPopup({ ... }),
 * });
 *
 * const mutation = api.card.delete.useMutation(deleteCallbacks);
 */

type QueryKey = readonly unknown[];

interface OptimisticCallbacksOptions<TData, TInput, TContext> {
  /** tRPC utils for cache manipulation */
  utils: {
    cancel: () => Promise<void>;
    getData: () => TData | undefined;
    setData: (data: TData | undefined) => void;
    invalidate: () => Promise<void>;
  };
  /** Transform function that receives entire query data and mutation input */
  updateFn: (data: TData, input: TInput) => TData;
  /** Optional error handler */
  onError?: (error: unknown) => void;
  /** Optional callback when visual state should complete (e.g., setIsDragging(false)) */
  onVisualComplete?: () => void;
}

interface OptimisticCallbacks<TInput, TContext> {
  onMutate: (input: TInput) => Promise<TContext>;
  onError: (
    error: unknown,
    input: TInput,
    context: TContext | undefined,
  ) => void;
  onSettled: () => Promise<void>;
}

/**
 * Creates standard optimistic update callbacks for mutations.
 *
 * The updateFn receives the ENTIRE query data (e.g., BoardData), not just
 * individual items. This allows complex updates that affect multiple
 * nested structures (e.g., moving cards between lists).
 */
export function createOptimisticUpdate<TData, TInput>(options: {
  utils: {
    cancel: () => Promise<void>;
    getData: () => TData | undefined;
    setData: (data: TData | undefined) => void;
    invalidate: () => Promise<void>;
  };
  updateFn: (data: TData, input: TInput) => TData;
  onError?: (error: unknown) => void;
  onVisualComplete?: () => void;
}): OptimisticCallbacks<TInput, { previousData: TData | undefined }> {
  return {
    onMutate: async (input: TInput) => {
      await options.utils.cancel();
      const previousData = options.utils.getData();

      if (previousData !== undefined) {
        const updatedData = options.updateFn(previousData, input);
        options.utils.setData(updatedData);
      }

      return { previousData };
    },
    onError: (error, _input, context) => {
      // Rollback to previous data
      if (context?.previousData !== undefined) {
        options.utils.setData(context.previousData);
      }
      options.onVisualComplete?.();
      options.onError?.(error);
    },
    onSettled: async () => {
      options.onVisualComplete?.();
      await options.utils.invalidate();
    },
  };
}

/**
 * Creates standard optimistic delete callbacks.
 * Convenience wrapper around createOptimisticUpdate with delete-specific naming.
 */
export function createOptimisticDelete<TData, TInput>(options: {
  utils: {
    cancel: () => Promise<void>;
    getData: () => TData | undefined;
    setData: (data: TData | undefined) => void;
    invalidate: () => Promise<void>;
  };
  /** Filter function that removes the deleted item from data */
  filterFn: (data: TData, input: TInput) => TData;
  onError?: (error: unknown) => void;
  onVisualComplete?: () => void;
}): OptimisticCallbacks<TInput, { previousData: TData | undefined }> {
  return createOptimisticUpdate({
    ...options,
    updateFn: options.filterFn,
  });
}
