import React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { VariantProps } from '@stitches/react';
import { useTranslation } from 'react-i18next';
import {
  AlertOverlay,
  AlertContainer,
  AlertTitle,
  AlertDescription,
  AlertActions,
  AlertAction,
  AlertCancel,
} from '../theme/alert';
import { Button } from '../theme';

export interface DialogProps {
  title?: string;
  description?: string;
  actionText?: string;
  showCancel?: boolean;
  cancelText?: string;
  actionButtonProps?: VariantProps<typeof Button>;
  variation?: 'default' | 'danger';
  onAction?: () => void;
}

function AlertContent({
  title,
  description,
  children,
  actionText,
  actionButtonProps,
  showCancel,
  cancelText,
  variation,
  onAction,
}: React.PropsWithChildren<DialogProps>) {
  const { t } = useTranslation();

  return (
    <AlertDialogPrimitive.Portal>
      <AlertOverlay />
      <AlertContainer variation={variation ?? 'default'}>
        {title && (
          <AlertTitle variation={variation ?? 'default'}>{title}</AlertTitle>
        )}
        {description && (
          <AlertDescription variation={variation ?? 'default'}>
            {description}
          </AlertDescription>
        )}
        {children}
        <AlertActions>
          <AlertAction asChild>
            <Button
              variation="primary"
              {...actionButtonProps}
              onClick={() => (onAction ? onAction() : null)}
            >
              {actionText || t('form-actions.ok')}
            </Button>
          </AlertAction>
          {showCancel && (
            <AlertCancel asChild>
              <Button>{cancelText || t('form-actions.cancel')}</Button>
            </AlertCancel>
          )}
        </AlertActions>
      </AlertContainer>
    </AlertDialogPrimitive.Portal>
  );
}

export default React.memo(AlertContent);
