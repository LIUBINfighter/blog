import React, { useState } from "react";

type CounterProps = {
  start?: number;
};

const Counter: React.FC<CounterProps> = ({ start = 0 }) => {
  const [count, setCount] = useState<number>(start);

  return (
    <div className="bg-card rounded border p-4">
      <p className="mb-2">Count: {count}</p>
      <div className="flex gap-2">
        <button
          className="rounded bg-accent px-3 py-1 text-white"
          onClick={() => setCount(c => c + 1)}
          aria-label="increment"
        >
          +1
        </button>
        <button
          className="rounded border px-3 py-1"
          onClick={() => setCount(c => c - 1)}
          aria-label="decrement"
        >
          -1
        </button>
        <button
          className="rounded border px-3 py-1"
          onClick={() => setCount(start)}
          aria-label="reset"
        >
          reset
        </button>
      </div>
    </div>
  );
};
export default Counter;
