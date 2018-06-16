declare interface Window {
    fbAsyncInit() : any;
}

declare interface FBInitParams {
    appId?:string;
    version?:string;
}

declare interface ShareDialogParams {
    method:string;
    href:string;
    quote?:string;
}

declare interface FBSDK {
    init(fbInitObject:FBInitParams):void;
    ui(params:ShareDialogParams, handler:(fbResponseObject:Object) => any):void;
}

declare var FB:FBSDK;