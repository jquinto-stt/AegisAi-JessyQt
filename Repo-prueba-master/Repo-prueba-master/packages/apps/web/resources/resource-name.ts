/**
 * ResourceName — Central identity registry for shared resources.
 *
 * Maps a code-friendly key to a dotted identity string used as SSM path
 * and Pulumi type. Every shared resource references its name from here.
 */
export enum ResourceName {
  // Example:
  // Vpc_Main = 'Vpc.Main',
  // Clusters_Main = 'Clusters.Main',
  // Config_LocalPorts = 'Config.LocalPorts',
}
