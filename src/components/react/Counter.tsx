import React, { useState } from "react";

type CounterProps = {
  start?: number;
};

export default function Counter({ start = 0 }: CounterProps) {
  const [count, setCount] = useState<number>(start);

  return (
    <div className="p-4 border rounded bg-card">
      <p className="mb-2">Count: {count}</p>
      <div className="flex gap-2">
        <button
          className="px-3 py-1 rounded bg-accent text-white"
          onClick={() => setCount((c) => c + 1)}
        >
          +1
        </button>
        <button
          className="px-3 py-1 rounded border"
          onClick={() => setCount((c) => c - 1)}
        >
          -1
        </button>
        <button
          className="px-3 py-1 rounded border"
          onClick={() => setCount(start)}
        >
          reset
        </button>
      </div>
    </div>
  );
}
