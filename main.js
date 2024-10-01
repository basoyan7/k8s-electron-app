// main.js

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const k8s = require('@kubernetes/client-node');

function createWindow() {
  const win = new BrowserWindow({
    width: 1300,
    height: 900,
    icon: path.join(__dirname, 'assets', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,    // Recommended for security
      nodeIntegration: false,    // Recommended for security
      enableRemoteModule: false, // Recommended for security
    },
  });

  win.loadFile('index.html');

  // Open DevTools for debugging (optional)
  // win.webContents.openDevTools();
}

// Load Kubernetes configuration
const kc = new k8s.KubeConfig();
kc.loadFromDefault();

// Create Kubernetes API clients
const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
const appsV1Api = kc.makeApiClient(k8s.AppsV1Api);
const networkingV1Api = kc.makeApiClient(k8s.NetworkingV1Api);

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Fetch Kubernetes resources
ipcMain.handle('fetchK8sResources', async (event, resourceType, namespace) => {
  try {
    let res;
    const isAllNamespaces = !namespace || namespace === '';

    switch (resourceType) {
      case 'pods':
        res = isAllNamespaces
          ? await coreV1Api.listPodForAllNamespaces()
          : await coreV1Api.listNamespacedPod(namespace);
        break;
      case 'deployments':
        res = isAllNamespaces
          ? await appsV1Api.listDeploymentForAllNamespaces()
          : await appsV1Api.listNamespacedDeployment(namespace);
        break;
      case 'statefulsets':
        res = isAllNamespaces
          ? await appsV1Api.listStatefulSetForAllNamespaces()
          : await appsV1Api.listNamespacedStatefulSet(namespace);
        break;
      case 'daemonsets':
        res = isAllNamespaces
          ? await appsV1Api.listDaemonSetForAllNamespaces()
          : await appsV1Api.listNamespacedDaemonSet(namespace);
        break;
      case 'services':
        res = isAllNamespaces
          ? await coreV1Api.listServiceForAllNamespaces()
          : await coreV1Api.listNamespacedService(namespace);
        break;
      case 'configmaps':
        res = isAllNamespaces
          ? await coreV1Api.listConfigMapForAllNamespaces()
          : await coreV1Api.listNamespacedConfigMap(namespace);
        break;
      case 'secrets':
        res = isAllNamespaces
          ? await coreV1Api.listSecretForAllNamespaces()
          : await coreV1Api.listNamespacedSecret(namespace);
        break;
      case 'ingresses':
        res = isAllNamespaces
          ? await networkingV1Api.listIngressForAllNamespaces()
          : await networkingV1Api.listNamespacedIngress(namespace);
        break;
      case 'namespaces':
        res = await coreV1Api.listNamespace();
        break;
      default:
        throw new Error(`Unsupported resource type: ${resourceType}`);
    }

    return res.body.items;
  } catch (error) {
    console.error('Error fetching Kubernetes resources:', error);
    throw new Error(error.message || 'Failed to fetch resources.');
  }
});

// Update Kubernetes resource
ipcMain.handle('updateK8sResource', async (event, resourceType, updatedResource) => {
  try {
    const namespace = updatedResource.metadata.namespace;
    const name = updatedResource.metadata.name;

    if (!namespace) {
      throw new Error('Namespace is required to update the resource.');
    }

    let response;

    switch (resourceType) {
      case 'pods':
        response = await coreV1Api.replaceNamespacedPod(name, namespace, updatedResource);
        break;
      case 'deployments':
        response = await appsV1Api.replaceNamespacedDeployment(name, namespace, updatedResource);
        break;
      case 'statefulsets':
        response = await appsV1Api.replaceNamespacedStatefulSet(name, namespace, updatedResource);
        break;
      case 'daemonsets':
        response = await appsV1Api.replaceNamespacedDaemonSet(name, namespace, updatedResource);
        break;
      case 'services':
        response = await coreV1Api.replaceNamespacedService(name, namespace, updatedResource);
        break;
      case 'configmaps':
        response = await coreV1Api.replaceNamespacedConfigMap(name, namespace, updatedResource);
        break;
      case 'secrets':
        response = await coreV1Api.replaceNamespacedSecret(name, namespace, updatedResource);
        break;
      case 'ingresses':
        response = await networkingV1Api.replaceNamespacedIngress(name, namespace, updatedResource);
        break;
      default:
        throw new Error(`Unsupported resource type: ${resourceType}`);
    }

    return response.body;
  } catch (error) {
    console.error('Error updating Kubernetes resource:', error);

    if (error.response && error.response.body) {
      console.error('Error response from Kubernetes API:', error.response.body);
      throw new Error(error.response.body.message || JSON.stringify(error.response.body));
    } else {
      throw new Error(error.message || 'Failed to update resource.');
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
