import React, {
  useState,
  useEffect,
  useRef,
  useReducer,
  useCallback,
} from 'react';
import './App.css';
import { calculateColumn, drawKeyColumn, LayoutMode } from './layout';
import { PopupState, usePopupState, useTwo } from './hooks';
import {
  Point2D,
  projectPointToLine,
  slopeInterceptFormToStandardForm,
} from './geometry';
import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/lib/Option';
import * as T from 'fp-ts/lib/Task';
import * as TE from 'fp-ts/lib/TaskEither';
import * as IO from 'fp-ts/lib/IO';
import * as IOE from 'fp-ts/lib/IOEither';
import { getFloat, getItem, setPrimitive } from './localStorage';
import { sequenceS } from 'fp-ts/lib/Apply';
import * as AED from './asyncEitherData';
import * as N from 'fp-ts-std/Number';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Label,
  Select,
  Dropdown,
  DropdownItem,
  Badge,
} from '@windmill/react-ui';
import { SaveIcon } from '@heroicons/react/solid';
import toast, { Toaster } from 'react-hot-toast';
import { copy } from './copy';
import { toKLE } from './converters/kle';

type Column = 'pinky' | 'ring' | 'middle' | 'index' | 'index_far' | 'thumb';

const defaultColumn = 'middle' as Column;

const columns: Column[] = [
  'thumb',
  'index_far',
  'index',
  'middle',
  'ring',
  'pinky',
];

const columnToColor = (c: Column): string => {
  switch (c) {
    case 'thumb':
      return '#363636';
    case 'index_far':
      return '#5454E8';
    case 'index':
      return '#9C9CB8';
    case 'middle':
      return '#CF9393';
    case 'ring':
      return '#59BDBD';
    case 'pinky':
      return '#A5FAFA';
  }
};

const ColumnSelect = ({
  column,
  onChange,
}: {
  column: Column;
  onChange: (c: Column) => void;
}) => (
  <div className="overflow-auto flex gap-2 pt-1 pb-1 pr-4">
    {columns.map((a) => (
      <Button
        layout={column === a ? 'outline' : 'primary'}
        key={a}
        onClick={() => onChange(a)}
        iconRight={() => (
          <div
            className="h-4 w-4 ml-2 rounded"
            style={{ backgroundColor: columnToColor(a) }}
          ></div>
        )}
        size="large"
      >
        {a}
      </Button>
    ))}
  </div>
);

type Pos = { x: number; y: number };

const Boo = ({
  data,
  ppm,
  keyCount,
  layoutMode,
  showAuxiliaryLines,
}: {
  data: Record<Column, Pos[]>;
  ppm: number;
  keyCount: number;
  layoutMode: LayoutMode;
  showAuxiliaryLines: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useTwo(
    ref,
    (two, el) => {
      Object.entries(data).forEach(([column, positions]) => {
        const fill = columnToColor(column as Column);
        if (showAuxiliaryLines) {
          positions.forEach((pos) => {
            const circle = two.makeCircle(pos.x, pos.y, 15);
            circle.linewidth = 0;
            circle.fill = fill;
            circle.opacity = 0.5;
          });
        }
        if (positions.length > 1) {
          const geom = calculateColumn(
            positions,
            column === 'thumb',
            ppm,
            layoutMode,
            keyCount,
          );
          if (!geom) return;

          const { trendline, isVertical, midPoint, rotation, keys } = geom;

          if (showAuxiliaryLines) {
            let line;
            if (isVertical) {
              // Vertical line x = midPoint.x
              line = two.makeLine(midPoint.x, 0, midPoint.x, el.clientHeight);
            } else {
              line = two.makeLine(
                0,
                trendline.b,
                el.clientWidth,
                trendline.m * el.clientWidth + trendline.b,
              );
            }
            line.stroke = fill;
            line.opacity = 0.5;
          }

          // Re-calculate projections for dots only (logic duplication but purely visual)
          // Or we could expose projections from calculateColumn if needed.
          // But calculateColumn focuses on Column Geometry (Center, Rotation).
          // Let's keep projection logic here for the 'red dots' visual.
          // actually, let's just duplicate the projection logic strictly for visual debug
          // since it's not affecting layout.
          let projections: Point2D[];
          if (isVertical) {
            projections = positions.map((p) => ({ x: midPoint.x, y: p.y }));
          } else {
            projections = positions.map(
              projectPointToLine(slopeInterceptFormToStandardForm(trendline)),
            );
          }

          if (showAuxiliaryLines) {
            projections.forEach((pos, i) => {
              const circle = two.makeCircle(pos.x, pos.y, 3);
              circle.linewidth = 0;
              circle.fill = 'red';
              circle.opacity = 0.3;

              const line = two.makeLine(
                pos.x,
                pos.y,
                positions[i].x,
                positions[i].y,
              );
              line.stroke = fill;
            });
          }

          const group = drawKeyColumn(two, ppm, keys);

          group.translation.set(midPoint.x, midPoint.y);
          group.rotation = rotation;
        }
      });

      two.update();
      return () => {
        two.clear();
      };
    },
    [data, ref.current, ppm, showAuxiliaryLines, keyCount],
  );
  return <div className="boo" ref={ref}></div>;
};

const defaultPositions: Record<Column, Pos[]> = {
  thumb: [],
  index_far: [],
  index: [],
  middle: [],
  ring: [],
  pinky: [],
};

const defaultMMPer300px = 100;

const DEFAULT_PX_PER_MM_VALUE = 5;

const PIX_PER_MM_LOCALSTORAGE_KEY = 'stored_ppm';

const PxPerMMControl = ({
  defaultValue,
  value,
  onChange,
}: {
  defaultValue: number;
  value: number;
  onChange: (a: number) => void;
}) => {
  const [inputVal, setInputVal] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const measureRef = useRef<HTMLDivElement>(null);
  const onChangeHandler = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = pipe(
        O.Do,
        O.apS(
          'px',
          pipe(
            measureRef.current,
            O.fromNullable,
            O.map((el) => el.clientWidth),
          ),
        ),
        O.apS('mm', pipe(evt.target.value, N.floatFromString)),
        O.bind('value', ({ mm, px }) => O.of(px / mm)),
      );

      setInputVal(
        pipe(
          newValue,
          O.map(({ mm }) => mm),
          O.getOrElse(() => 130),
        ),
      );
      onChange(
        pipe(
          newValue,
          O.map(({ value }) => value),
          O.getOrElse(() => defaultValue * 130),
        ),
      );
    },
    [onChange],
  );
  useEffect(() => {
    if (isModalOpen && measureRef.current) {
      setInputVal(measureRef.current.clientWidth / value);
    }
  }, [measureRef.current, isModalOpen]);

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>Tune scale</Button>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalHeader>
          <span className="text-xl">Tune scale factor</span>
        </ModalHeader>
        <ModalBody>
          <p className="mb-4 text-base">
            Default values used for displaying keycap size can be too far from
            real keycap size. To correct that measure width of the red line
            below and enter width in mm in the input.
          </p>
          <div ref={measureRef} className="h-1 bg-red-700 mb-2" />
          <Label>
            <p className="mb-1 text-sm">Red line width in mm</p>
            <Input
              css=""
              type="number"
              value={inputVal}
              onChange={onChangeHandler}
            />
          </Label>
        </ModalBody>
        <ModalFooter>
          <Button
            className="w-full sm:w-auto"
            onClick={() => setIsModalOpen(false)}
          >
            Ok
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

const Export = ({
  onRawExport,
  onKLEExport,
  state,
}: {
  onRawExport: () => void;
  onKLEExport: () => void;
  state: PopupState;
}) => {
  // https://github.com/estevanmaito/windmill-react-ui/issues/34
  const key = String(state.isOpen);

  return (
    <div className="relative">
      <Button
        key={key + 'button'}
        onClick={state.toggle}
        aria-label="Notifications"
        aria-haspopup="true"
        icon={SaveIcon}
      >
        Export
      </Button>
      <Dropdown
        isOpen={state.isOpen}
        onClose={state.close}
        key={key + 'dropdown'}
      >
        {/* <DropdownItem
          // tag="a"
          // href="#"
          className="justify-between"
          disabled
        >
          <span>Ergogen</span>
          <Badge type="danger">not available</Badge>
        </DropdownItem> */}
        <DropdownItem onClick={onRawExport}>
          <span>Raw</span>
        </DropdownItem>
        <DropdownItem onClick={onKLEExport}>
          <span>KLE JSON</span>
        </DropdownItem>
      </Dropdown>
    </div>
  );
};

export const App = ({ storedPpm }: { storedPpm: O.Option<number> }) => {
  const [column, setColumn] = useState(defaultColumn);
  const [positions, setPositions] = useState(defaultPositions);
  const [showAuxiliaryLines, setShowAuxiliaryLines] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const defaultPpm = pipe(
    storedPpm,
    O.getOrElse(() => DEFAULT_PX_PER_MM_VALUE),
  );
  const [ppm, setPpm] = useState(defaultPpm);
  const [keyCount, setKeyCount] = useState(4);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('compact');

  const onPpmChange = useCallback(
    (newPpm: number) => {
      setPrimitive(PIX_PER_MM_LOCALSTORAGE_KEY, newPpm)();
      setPpm(newPpm);
    },
    [setPpm, setPrimitive],
  );

  const exportState = usePopupState(false);
  const onRawExport = useCallback(() => {
    copy(JSON.stringify(positions))
      .then(() => {
        toast.success('Copied to clipboard');
      })
      .catch(() => {
        toast.error('Something went wrong');
      })
      .finally(() => {
        exportState.close();
      });
  }, [positions, exportState.close]);

  const onKLEExport = useCallback(() => {
    const kleData = toKLE(positions, ppm, keyCount, layoutMode);
    copy(JSON.stringify(kleData, null, 2))
      .then(() => {
        toast.success('Copied KLE JSON to clipboard');
      })
      .catch(() => {
        toast.error('Something went wrong');
      })
      .finally(() => {
        exportState.close();
      });
  }, [positions, ppm, keyCount, layoutMode, exportState.close]);

  useEffect(() => {
    function f(this: HTMLDivElement, evt: PointerEvent) {
      evt.preventDefault();
      setPositions((pos) => ({
        ...pos,
        [column]: pos[column].concat([
          {
            x: evt.offsetX,
            y: evt.offsetY,
          },
        ]),
      }));
    }
    ref.current?.addEventListener('pointerdown', f);
    return () => {
      ref.current?.removeEventListener('pointerdown', f);
    };
  }, [ref.current, column]);

  return (
    <div className="app">
      <div>
        <Toaster />
      </div>
      <div className="container p-4 pt-3 pr-0 flex flex-col gap-4">
        <ColumnSelect column={column} onChange={(c) => setColumn(c)} />
        <div className="flex gap-2 pr-4">
          <Button
            className=""
            onClick={() =>
              setPositions((pos) => ({
                ...pos,
                [column]: [],
              }))
            }
          >
            Reset column
          </Button>
          <Button className="" onClick={() => setPositions(defaultPositions)}>
            Reset all
          </Button>
          <PxPerMMControl
            value={ppm}
            onChange={onPpmChange}
            defaultValue={defaultPpm}
          />
          <Label>
            <Button tag="span">
              <Input
                type="checkbox"
                css=""
                checked={showAuxiliaryLines}
                onChange={(evt) => {
                  setShowAuxiliaryLines((val) => !val);
                }}
              />
              <span className="ml-2">Aux lines</span>
            </Button>
          </Label>
          <Label className="mt-4">
            <span>Key Count</span>
            <Select
              className="mt-1"
              value={keyCount}
              onChange={(e) => setKeyCount(parseInt(e.target.value))}
            >
              <option value={1}>1 Key</option>
              <option value={2}>2 Keys</option>
              <option value={3}>3 Keys</option>
              <option value={4}>4 Keys</option>
            </Select>
          </Label>
          <Label className="mt-4">
            <span>Mode</span>
            <Select
              className="mt-1"
              value={layoutMode}
              onChange={(e) => setLayoutMode(e.target.value as LayoutMode)}
            >
              <option value="compact">Compact</option>
              <option value="loose">Loose</option>
            </Select>
          </Label>
          <Export
            onRawExport={onRawExport}
            onKLEExport={onKLEExport}
            state={exportState}
          />
        </div>
      </div>
      <div className="touchytouchy" ref={ref}>
        <Boo
          data={positions}
          ppm={ppm}
          keyCount={keyCount}
          layoutMode={layoutMode}
          showAuxiliaryLines={showAuxiliaryLines}
        />
      </div>
    </div>
  );
};

const setup = () =>
  pipe(
    { ppm: TE.fromIOEither(getFloat(PIX_PER_MM_LOCALSTORAGE_KEY)) },
    sequenceS(TE.ApplyPar),
  );

export default () =>
  pipe(
    AED.useAsyncEitherData(setup()),
    AED.fold(
      () => <>Initialization</>,
      () => <>Loading</>,
      (e) => <p>Error: {JSON.stringify(e)}</p>,
      (config) => <App storedPpm={config.ppm} />,
    ),
  );
