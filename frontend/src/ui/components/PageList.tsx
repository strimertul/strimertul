import React from 'react';
import { useTranslation } from 'react-i18next';
import { styled, Toolbar, ToolbarButton, ToolbarComboBox } from '../theme';

export interface PageListProps {
  current: number;
  max: number;
  min: number;
  itemsPerPage: number;
  onSelectChange: (itemsPerPage: number) => void;
  onPageChange: (page: number) => void;
}

const ToolbarSection = styled('section', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.3rem',
});

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
    <Toolbar
      role="navigation"
      aria-label={t('pagination.title')}
      css={{
        '@medium': {
          flexDirection: 'row-reverse',
          justifyContent: 'space-between',
        },
      }}
    >
      <ToolbarSection
        css={{
          '@mobile': { flex: 1 },
          '@medium': { flex: 0 },
        }}
      >
        <ToolbarButton
          aria-label={t('pagination.previous')}
          title={t('pagination.previous')}
          disabled={current <= min}
          onClick={() => onPageChange(current - 1)}
          css={{
            '@mobile': { flex: 1 },
            '@medium': { flex: 0 },
          }}
        >
          &lsaquo;
        </ToolbarButton>
        <ToolbarButton
          aria-label={t('pagination.next')}
          title={t('pagination.next')}
          disabled={current >= max}
          onClick={() => onPageChange(current + 1)}
          css={{
            '@mobile': { flex: 1 },
            '@medium': { flex: 0 },
          }}
        >
          &rsaquo;
        </ToolbarButton>
        <ToolbarComboBox
          title={t('pagination.items-per-page')}
          aria-label={t('pagination.items-per-page')}
          value={itemsPerPage}
          onChange={(ev) => onSelectChange(Number(ev.target.value))}
          css={{
            textAlign: 'center',
            '@mobile': { flex: 1 },
            '@medium': { flex: 0 },
          }}
        >
          <option value={15}>15</option>
          <option value={30}>30</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </ToolbarComboBox>
      </ToolbarSection>
      <ToolbarSection>
        <div style={{ padding: '0 0.25rem' }}>
          {t('pagination.page', { page: current })}
        </div>
        {current > min ? (
          <ToolbarButton
            className="button pagination-link"
            aria-label={t('pagination.gotofirst')}
            title={t('pagination.gotofirst')}
            onClick={() => onPageChange(min)}
          >
            {min}
          </ToolbarButton>
        ) : null}
        {current > min + 2 ? (
          <span className="pagination-ellipsis">&hellip;</span>
        ) : null}

        {current > min + 1 ? (
          <ToolbarButton
            className="button pagination-link"
            aria-label={t('pagination.gotopage', {
              page: current - 1,
            })}
            title={t('pagination.gotopage', {
              page: current - 1,
            })}
            onClick={() => onPageChange(current - 1)}
          >
            {current - 1}
          </ToolbarButton>
        ) : null}
        <ToolbarButton
          disabled={true}
          className="pagination-link is-current"
          aria-label={t('pagination.page', {
            page: current,
          })}
          title={t('pagination.page', {
            page: current,
          })}
          aria-current="page"
          css={{
            border: '1px solid $teal7',
            cursor: 'inherit',
            background: '$teal7',
          }}
        >
          {current}
        </ToolbarButton>
        {current < max ? (
          <ToolbarButton
            className="button pagination-link"
            aria-label={t('pagination.gotopage', {
              page: current + 1,
            })}
            title={t('pagination.gotopage', {
              page: current + 1,
            })}
            onClick={() => onPageChange(current + 1)}
          >
            {current + 1}
          </ToolbarButton>
        ) : null}
        {current < max - 2 ? (
          <span className="pagination-ellipsis">&hellip;</span>
        ) : null}
        {current < max - 1 ? (
          <ToolbarButton
            className="button pagination-link"
            aria-label={t('pagination.gotolast')}
            title={t('pagination.gotolast')}
            onClick={() => onPageChange(max)}
          >
            {max}
          </ToolbarButton>
        ) : null}
      </ToolbarSection>
    </Toolbar>
  );
}

export default React.memo(PageList);
