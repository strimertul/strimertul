import React from 'react';

export interface PageListProps {
  current: number;
  max: number;
  min: number;
  onPageChange: (page: number) => void;
}

export default function PageList({
  current,
  max,
  min,
  onPageChange,
}: PageListProps): React.ReactElement {
  return (
    <nav
      className="pagination is-centered is-small"
      role="navigation"
      aria-label="pagination"
    >
      <button
        className="button pagination-previous"
        disabled={current <= min}
        onClick={() => onPageChange(current - 1)}
      >
        Previous
      </button>
      <button
        className="button pagination-next"
        disabled={current >= max}
        onClick={() => onPageChange(current + 1)}
      >
        Next page
      </button>
      <ul className="pagination-list">
        {current > min ? (
          <li>
            <button
              className="button pagination-link"
              aria-label={`Goto page ${min}`}
              onClick={() => onPageChange(min)}
            >
              {min}
            </button>
          </li>
        ) : null}
        {current > min + 2 ? (
          <li>
            <span className="pagination-ellipsis">&hellip;</span>
          </li>
        ) : null}

        {current > min + 1 ? (
          <li>
            <button
              className="button pagination-link"
              aria-label={`Goto page ${current - 1}`}
              onClick={() => onPageChange(current - 1)}
            >
              {current - 1}
            </button>
          </li>
        ) : null}
        <li>
          <button
            className="pagination-link is-current"
            aria-label={`Page ${current}`}
            aria-current="page"
          >
            {current}
          </button>
        </li>
        {current < max ? (
          <li>
            <button
              className="button pagination-link"
              aria-label={`Goto page ${current + 1}`}
              onClick={() => onPageChange(current + 1)}
            >
              {current + 1}
            </button>
          </li>
        ) : null}
        {current < max - 2 ? (
          <li>
            <span className="pagination-ellipsis">&hellip;</span>
          </li>
        ) : null}
        {current < max - 1 ? (
          <li>
            <button
              className="button pagination-link"
              aria-label={`Goto page ${max}`}
              onClick={() => onPageChange(max)}
            >
              {max}
            </button>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
