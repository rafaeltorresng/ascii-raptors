import type { FlightPose, RaptorOptions } from '../../src/index.ts';
type OriginalOptions = Partial<Omit<RaptorOptions, 'species'>>;
/** Only the v0.1 API exercised by the frozen-reference comparison. */
export declare class AsciiRaptor {
  constructor(canvas: HTMLCanvasElement, options?: OriginalOptions);
  setOptions(options: OriginalOptions): void;
  renderAt(seconds: number, pose?: Partial<FlightPose>): void;
  destroy(): void;
}
