declare interface Screenfull {
    isFullscreen:boolean;
    enabled:boolean;
    request(HTMLElement):void;
}

declare var screenfull:Screenfull;