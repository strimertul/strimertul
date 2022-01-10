import { Cross2Icon } from '@radix-ui/react-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, FlexRow, Textarea } from '../theme';

export interface MultiInputProps {
  placeholder?: string;
  value: string[];
  required?: boolean;
  disabled?: boolean;
  onChange: (value: string[]) => void;
}

function MultiInput({
  value,
  placeholder,
  onChange,
  required,
  disabled,
}: MultiInputProps) {
  const { t } = useTranslation();

  return (
    <>
      {value.map((message, index) => (
        <FlexRow
          key={`${value.length}-${index}`}
          css={{ marginTop: '0.5rem', flex: 1 }}
        >
          <FlexRow border="form" css={{ flex: 1, alignItems: 'stretch' }}>
            <Textarea
              disabled={disabled}
              border="none"
              required={required}
              placeholder={placeholder}
              onChange={(ev) => {
                const newMessages = [...value];
                newMessages[index] = ev.target.value;
                onChange(newMessages);
              }}
              value={message}
              className={message !== '' ? 'input' : 'input is-danger'}
              css={
                value.length > 1
                  ? {
                      borderRadius: '$borderRadius$form 0 0 $borderRadius$form',
                      flex: 1,
                    }
                  : { flex: 1 }
              }
            >
              {message}
            </Textarea>
            {value.length > 1 && (
              <Button
                disabled={disabled}
                type="button"
                variation="danger"
                styling="form"
                onClick={() => {
                  const newMessages = [...value];
                  newMessages.splice(index, 1);
                  onChange(newMessages.length > 0 ? newMessages : ['']);
                }}
                css={{
                  margin: '-1px',
                  borderRadius: '0 $borderRadius$form $borderRadius$form 0',
                }}
              >
                <Cross2Icon />
              </Button>
            )}
          </FlexRow>
        </FlexRow>
      ))}
      <FlexRow align="left">
        <Button
          disabled={disabled}
          size="small"
          styling="link"
          type="button"
          css={{ marginTop: '0.5rem' }}
          onClick={() => {
            onChange([...value, '']);
          }}
        >
          {t('form-actions.add')}
        </Button>
      </FlexRow>
    </>
  );
}

export default React.memo(MultiInput);
