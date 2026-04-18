declare global {
  interface Window {
    FB: {
      init: (config: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: {
          authResponse?: {
            accessToken: string;
            userID: string;
            expiresIn: number;
          };
          status: string;
        }) => void | Promise<void>,
        options?: { scope: string }
      ) => void;
    };
  }
}

export {};

