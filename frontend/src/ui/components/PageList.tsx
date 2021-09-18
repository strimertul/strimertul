import React from 'react';
import { useTranslation } from 'react-i18next';

export interface PageListProps {
  current: number;
  max: number;
  min: number;
  itemsPerPage: number;
  onSelectChange: (itemsPerPage: number) => void;
  onPageChange: (page: number) => void;
}

function PageList({
  current,
  max,
  min,
  itemsPerPage,
  onSelectChange,
  onPageChange,
}: PageListProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <nav
      className="pagination is-small"
      role="navigation"
      aria-label="pagination"
    >
      <button
        className="button pagination-previous"
        disabled={current <= min}
        onClick={() => onPageChange(current - 1)}
      >
        &lsaquo;
      </button>
      <button
        className="button pagination-next"
        disabled={current >= max}
        onClick={() => onPageChange(current + 1)}
      >
        &rsaquo;
      </button>
      <select
        className="pagination-next"
        value={itemsPerPage}
        onChange={(ev) => onSelectChange(Number(ev.target.value))}
      >
        <option value={15}>15</option>
        <option value={30}>30</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
      <ul className="pagination-list">
        {current > min ? (
          <li>
            <button
              className="button pagination-link"
              aria-label={t('system.pagination.gotopage', { page: min })}
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
              aria-label={t('system.pagination.gotopage', {
                page: current - 1,
              })}
              onClick={() => onPageChange(current - 1)}
            >
              {current - 1}
            </button>
          </li>
        ) : null}
        <li>
          <button
            className="pagination-link is-current"
            aria-label={t('system.pagination.page', {
              page: current,
            })}
            aria-current="page"
          >
            {current}
          </button>
        </li>
        {current < max ? (
          <li>
            <button
              className="button pagination-link"
              aria-label={t('system.pagination.gotopage', {
                page: current + 1,
              })}
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
              aria-label={t('system.pagination.gotopage', {
                page: max,
              })}
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

export default React.memo(PageList);
