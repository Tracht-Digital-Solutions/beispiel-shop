import { useMotionPreference } from './useMotionPreference';
import {
  Children,
  isValidElement,
  useRef,
  useState,
  useLayoutEffect,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { Select } from '@base-ui/react/select';

import { MotionRoot } from './Motion';
import { slideElement, timing } from '../lib/motion';
import '../styles/dropdown-swipe.css';

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  onChange?: (event: { target: { value: string } }) => void;
};
function options(children: ReactNode): { value: string; label: ReactNode }[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode }>(child)) return [];
    if (child.type === 'option')
      return [
        { value: String(child.props.value ?? child.props.children), label: child.props.children },
      ];
    return options(child.props.children);
  });
}
export default function SlideSelect(props: Props) {
  return (
    <MotionRoot>
      <SelectControl {...props} />
    </MotionRoot>
  );
}
function SelectControl({
  children,
  value,
  defaultValue,
  onChange,
  id,
  name,
  autoComplete,
  required,
  disabled,
  ...props
}: Props) {
  const items = options(children);
  const [open, setOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const actions = useRef<Select.Root.Actions>(null);
  const reduced = useMotionPreference();
  const [popup, setPopup] = useState<HTMLDivElement | null>(null);
  const wasOpen = useRef(false);
  useLayoutEffect(() => {
    if (!popup) return;
    const from = wasOpen.current ? getComputedStyle(popup).transform : 'translateY(-105%)';
    wasOpen.current = open;
    return slideElement(
      popup,
      from,
      open ? 'none' : 'translateY(-105%)',
      reduced ? 0 : timing.small,
      () => {
        setMoving(false);
        if (!open) actions.current?.unmount();
      },
    );
  }, [popup, open, reduced]);
  return (
    <Select.Root
      items={items}
      value={value === undefined ? undefined : String(value)}
      defaultValue={defaultValue === undefined ? undefined : String(defaultValue)}
      onValueChange={(next) => onChange?.({ target: { value: next ?? '' } })}
      open={open}
      onOpenChange={(next) => {
        setContainer(trigger.current?.closest('dialog') ?? document.body);
        setMoving(true);
        setOpen(next);
      }}
      actionsRef={actions}
      modal={false}
      name={name}
      autoComplete={autoComplete}
      required={required}
      disabled={disabled}
    >
      <Select.Trigger
        ref={trigger}
        id={id}
        className="slide-select-trigger"
        aria-label={props['aria-label']}
      >
        <Select.Value />
        <Select.Icon>⌄</Select.Icon>
      </Select.Trigger>
      <Select.Portal container={container}>
        <Select.Positioner
          sideOffset={4}
          align="start"
          alignItemWithTrigger={false}
          className="slide-select-positioner"
        >
          <Select.Popup
            ref={setPopup}
            className="slide-select-popup"
            data-moving={moving}
            inert={!open}
          >
            <Select.List>
              {items.map((item) => (
                <Select.Item
                  key={item.value}
                  data-value={item.value}
                  value={item.value}
                  className="slide-select-option"
                >
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator>✓</Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
