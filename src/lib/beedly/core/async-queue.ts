/**
 * Push-based async iterable: turns callbacks (IPC events) into a stream that
 * can be consumed with `for await`.
 */
export class AsyncQueue<T> implements AsyncIterable<T> {
	private items: T[] = [];
	private waiting: Array<{
		resolve: (result: IteratorResult<T>) => void;
		reject: (error: unknown) => void;
	}> = [];
	private closed = false;
	private error: unknown = undefined;

	push(item: T): void {
		if (this.closed) return;
		const waiter = this.waiting.shift();
		if (waiter) waiter.resolve({ value: item, done: false });
		else this.items.push(item);
	}

	end(): void {
		if (this.closed) return;
		this.closed = true;
		this.waiting
			.splice(0)
			.forEach((waiter) => waiter.resolve({ value: undefined, done: true }));
	}

	fail(error: unknown): void {
		if (this.closed) return;
		this.closed = true;
		this.error = error;
		this.waiting.splice(0).forEach((waiter) => waiter.reject(error));
	}

	[Symbol.asyncIterator](): AsyncIterator<T> {
		return {
			next: () => {
				if (this.items.length > 0) {
					return Promise.resolve({ value: this.items.shift()!, done: false });
				}
				if (this.error !== undefined) return Promise.reject(this.error);
				if (this.closed) {
					return Promise.resolve({ value: undefined, done: true });
				}
				return new Promise((resolve, reject) =>
					this.waiting.push({ resolve, reject }),
				);
			},
		};
	}
}
