import { Path, Method } from '@webiai/sdk.http';

namespace EP {
  //!PATH - Root
  export const Root$ = new Path('/');

  //?ENDPOINT - Health check
  export const $Health = Root$.sub('/health').endpoint(Method.GET);
}

export default EP;
