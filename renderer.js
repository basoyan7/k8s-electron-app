// renderer.js

document.addEventListener('DOMContentLoaded', () => {
  const namespaceSelect = document.getElementById('namespace');
  const resourceButtons = document.querySelectorAll('.resource-button');
  const wideOutputCheckbox = document.getElementById('wide-output');
  let activeResourceType = '';
  let selectedResource = null; // Keep track of the resource being edited
  let refreshInterval;

  // Initialize resource button event listeners
  resourceButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      activeResourceType = button.getAttribute('data-resource');
      const namespace = namespaceSelect.value;
      resourceButtons.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');

      if (namespace !== undefined) {
        await fetchResources(activeResourceType, namespace);
      }
    });
  });

  // Event listener for namespace changes
  namespaceSelect.addEventListener('change', () => {
    if (activeResourceType) {
      const namespace = namespaceSelect.value;
      fetchResources(activeResourceType, namespace);
    }
  });

  // Listen for changes on the wide output checkbox
  wideOutputCheckbox.addEventListener('change', () => {
    if (activeResourceType && namespaceSelect.value !== undefined) {
      fetchResources(activeResourceType, namespaceSelect.value);
    }
  });

  // Function to load namespaces
  async function loadNamespaces() {
    try {
      // Clear existing options
      namespaceSelect.innerHTML = '';

      // Add "All Namespaces" option
      const allNamespacesOption = document.createElement('option');
      allNamespacesOption.value = '';
      allNamespacesOption.text = 'All Namespaces';
      namespaceSelect.add(allNamespacesOption);

      const namespaces = await window.electronAPI.fetchK8sResources('namespaces');
      namespaces.forEach((ns) => {
        const option = document.createElement('option');
        option.value = ns.metadata.name;
        option.text = ns.metadata.name;
        namespaceSelect.add(option);
      });

      // Set "All Namespaces" as the default selected option
      namespaceSelect.value = '';

      // Load initial resources
      activeResourceType = resourceButtons[0].getAttribute('data-resource');
      fetchResources(activeResourceType, namespaceSelect.value);
      resourceButtons[0].classList.add('active');

      // Start auto-refresh
      startAutoRefresh();
    } catch (error) {
      console.error('Error loading namespaces:', error);
      alert('Failed to load namespaces. Please check the console for more details.');
    }
  }

  // Function to fetch resources based on type and namespace
  async function fetchResources(resourceType, namespace) {
    try {
      if (resourceType) {
        console.log(`Fetching resources: type=${resourceType}, namespace=${namespace || 'All Namespaces'}`);
        const resources = await window.electronAPI.fetchK8sResources(resourceType, namespace);
        renderResourceTable(resources, resourceType);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
      alert(`Failed to fetch resources. Please check the console for more details.\nError: ${error.message}`);
    }
  }

  // Determine the correct apiVersion for each resource type
  function determineApiVersion(resourceType) {
    const apiVersions = {
      pods: 'v1',
      deployments: 'apps/v1',
      statefulsets: 'apps/v1',
      daemonsets: 'apps/v1',
      services: 'v1',
      configmaps: 'v1',
      secrets: 'v1',
      ingresses: 'networking.k8s.io/v1',
    };
    return apiVersions[resourceType] || 'v1';
  }

  // Determine the correct kind for each resource type
  function determineKind(resourceType) {
    const kinds = {
      pods: 'Pod',
      deployments: 'Deployment',
      statefulsets: 'StatefulSet',
      daemonsets: 'DaemonSet',
      services: 'Service',
      configmaps: 'ConfigMap',
      secrets: 'Secret',
      ingresses: 'Ingress',
    };
    return kinds[resourceType] || 'Unknown';
  }

  // Function to render the resource table
  function renderResourceTable(resources, resourceType) {
    const resourceTable = document.getElementById('resource-table');
    resourceTable.innerHTML = ''; // Clear previous table data

    // Determine if wide output is enabled
    const isWideOutput = wideOutputCheckbox.checked;

    // Define headers for each resource type
    const baseHeaders = {
      pods: ['Namespace', 'Name', 'Ready', 'Status', 'Restarts', 'Age'],
      deployments: ['Namespace', 'Name', 'Ready', 'Up-to-Date', 'Available', 'Age'],
      statefulsets: ['Namespace', 'Name', 'Ready', 'Age'],
      daemonsets: ['Namespace', 'Name', 'Desired', 'Current', 'Ready', 'Age'],
      services: ['Namespace', 'Name', 'Type', 'Cluster IP', 'External IP', 'Age'],
      configmaps: ['Namespace', 'Name', 'Data', 'Age'],
      secrets: ['Namespace', 'Name', 'Type', 'Data', 'Age'],
      ingresses: ['Namespace', 'Name', 'Hosts', 'Age'],
    };

    const wideHeaders = {
      pods: ['IP', 'Node', 'Nominated Node', 'Readiness Gates'],
      deployments: ['Strategy', 'Selector'],
      statefulsets: ['Service Name', 'Selector'],
      daemonsets: [],
      services: ['Selector'],
      configmaps: [],
      secrets: [],
      ingresses: ['Default Backend'],
    };

    // Combine headers based on wide output
    const headers = [...baseHeaders[resourceType]];

    if (isWideOutput && wideHeaders[resourceType].length > 0) {
      headers.push(...wideHeaders[resourceType]);
    }

    headers.push('Actions'); // Add Actions column at the end

    // Create table header
    const tableHeader = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headers.forEach((header) => {
      const th = document.createElement('th');
      th.innerText = header;
      headerRow.appendChild(th);
    });
    tableHeader.appendChild(headerRow);
    resourceTable.appendChild(tableHeader);

    // Create table body
    const tableBody = document.createElement('tbody');
    resources.forEach((resource) => {
      const row = document.createElement('tr');
      headers.forEach((header) => {
        const cell = document.createElement('td');
        switch (header) {
          case 'Namespace':
            cell.innerText = resource.metadata.namespace || 'N/A';
            break;
          case 'Name':
            cell.innerText = resource.metadata.name || 'N/A';
            break;
          case 'Ready':
            if (resourceType === 'deployments' || resourceType === 'statefulsets') {
              cell.innerText = `${resource.status.readyReplicas || 0}/${resource.spec.replicas || 0}`;
            } else if (resourceType === 'pods') {
              const readyContainers = resource.status.containerStatuses
                ? resource.status.containerStatuses.filter((c) => c.ready).length
                : 0;
              cell.innerText = `${readyContainers}/${resource.spec.containers.length}`;
            } else if (resourceType === 'daemonsets') {
              cell.innerText = `${resource.status.numberReady || 0}/${resource.status.desiredNumberScheduled || 0}`;
            }
            break;
          case 'Status':
            cell.innerText = resource.status.phase || 'Unknown';
            break;
          case 'Restarts':
            if (resource.status.containerStatuses) {
              const restarts = resource.status.containerStatuses.reduce(
                (acc, curr) => acc + curr.restartCount,
                0
              );
              cell.innerText = restarts;
            } else {
              cell.innerText = 0;
            }
            break;
          case 'Desired':
            cell.innerText = resource.status.desiredNumberScheduled || 'N/A';
            break;
          case 'Current':
            cell.innerText = resource.status.currentNumberScheduled || 'N/A';
            break;
          case 'Up-to-Date':
            cell.innerText = resource.status.updatedReplicas || 0;
            break;
          case 'Available':
            cell.innerText = resource.status.availableReplicas || 0;
            break;
          case 'Age':
            cell.innerText = calculateAge(resource.metadata.creationTimestamp);
            break;
          case 'Data':
            if (resourceType === 'configmaps' || resourceType === 'secrets') {
              cell.innerText = resource.data ? Object.keys(resource.data).length : 0;
            }
            break;
          case 'Type':
            // Check if 'type' exists in the secrets resource
            cell.innerText = resource.type || 'N/A';
            break;
          case 'Cluster IP':
            cell.innerText = resource.spec.clusterIP || 'N/A';
            break;
          case 'External IP':
            cell.innerText = resource.spec.externalIPs ? resource.spec.externalIPs.join(', ') : 'N/A';
            break;
          case 'Hosts':
            if (resourceType === 'ingresses') {
              cell.innerText = resource.spec.rules.map((rule) => rule.host).join(', ');
            }
            break;
          // Wide output columns
          case 'IP':
            cell.innerText = resource.status.podIP || 'N/A';
            break;
          case 'Node':
            cell.innerText = resource.spec.nodeName || 'N/A';
            break;
          case 'Nominated Node':
            cell.innerText = resource.status.nominatedNodeName || 'N/A';
            break;
          case 'Readiness Gates':
            if (resource.spec.readinessGates) {
              cell.innerText = resource.spec.readinessGates.map((gate) => gate.conditionType).join(', ');
            } else {
              cell.innerText = 'None';
            }
            break;
          case 'Strategy':
            cell.innerText = resource.spec.strategy ? resource.spec.strategy.type : 'N/A';
            break;
          case 'Selector':
            if (resource.spec.selector) {
              cell.innerText = JSON.stringify(resource.spec.selector.matchLabels || {});
            } else {
              cell.innerText = 'N/A';
            }
            break;
          case 'Service Name':
            cell.innerText = resource.spec.serviceName || 'N/A';
            break;
          case 'Default Backend':
            if (resource.spec.defaultBackend) {
              const backend = resource.spec.defaultBackend;
              if (backend.service) {
                cell.innerText = `${backend.service.name}:${backend.service.port.number || backend.service.port.name}`;
              } else {
                cell.innerText = 'N/A';
              }
            } else {
              cell.innerText = 'N/A';
            }
            break;
          case 'Actions':
            const editButton = document.createElement('button');
            editButton.innerText = 'Edit';
            editButton.classList.add('btn', 'btn-sm', 'btn-warning');
            editButton.addEventListener('click', () => openEditModal(resource));
            cell.appendChild(editButton);
            break;
          default:
            cell.innerText = 'N/A';
        }
        row.appendChild(cell);
      });
      tableBody.appendChild(row);
    });
    resourceTable.appendChild(tableBody);
  }

  // Function to open the edit modal with resource YAML
  function openEditModal(resource) {
    const resourceYamlTextarea = document.getElementById('resource-yaml');
    selectedResource = resource;

    // Ensure apiVersion and kind are present before converting to YAML
    let resourceToEdit = { ...resource };

    // Explicitly set apiVersion and kind if they are not present
    resourceToEdit.apiVersion = resourceToEdit.apiVersion || determineApiVersion(activeResourceType);
    resourceToEdit.kind = resourceToEdit.kind || determineKind(activeResourceType);

    console.log('Opening edit modal for resource:', resourceToEdit);

    // Convert the resource to YAML format
    try {
      const yamlString = jsyaml.dump(resourceToEdit);
      console.log('YAML being edited:', yamlString);

      // Display the YAML in the editor
      resourceYamlTextarea.value = yamlString;
      $('#editModal').modal('show');
    } catch (err) {
      console.error('Error converting resource to YAML:', err);
      alert('Failed to convert resource to YAML. Please check the console for more details.');
    }
  }

  // Event listener for saving edited resource
  document.getElementById('save-resource-button').addEventListener('click', async () => {
    const updatedYaml = document.getElementById('resource-yaml').value;
    try {
      const updatedResource = jsyaml.load(updatedYaml);

      // Log the updated resource to verify fields are present
      console.log('YAML after loading:', updatedResource);

      // Ensure we retain the original apiVersion and kind if they weren't altered
      updatedResource.apiVersion = updatedResource.apiVersion || selectedResource.apiVersion;
      updatedResource.kind = updatedResource.kind || selectedResource.kind;

      // Clean the metadata by removing read-only fields
      updatedResource.metadata = {
        name: selectedResource.metadata.name,
        namespace: selectedResource.metadata.namespace,
        labels: updatedResource.metadata.labels || selectedResource.metadata.labels,
        annotations: updatedResource.metadata.annotations || selectedResource.metadata.annotations,
        // Include other mutable metadata fields as needed
      };

      // Optionally, remove read-only fields from the entire resource
      removeReadOnlyFields(updatedResource);

      console.log('Attempting to save updated resource:', updatedResource);

      await window.electronAPI.updateK8sResource(activeResourceType, updatedResource);
      alert('Changes saved successfully.');
      $('#editModal').modal('hide');
      // Refresh the resources after saving
      fetchResources(activeResourceType, namespaceSelect.value);
    } catch (error) {
      console.error('Error saving resource:', error);

      if (error instanceof jsyaml.YAMLException) {
        alert(`YAML format error: ${error.message}. Please correct the YAML syntax and try again.`);
      } else {
        alert(`Error while saving resource: ${error.message}`);
        console.error('Full error stack:', error.stack);
      }
    }
  });

  // Function to remove read-only fields from the resource object
  function removeReadOnlyFields(obj) {
    const readOnlyFields = [
      'status',
      'metadata.creationTimestamp',
      'metadata.generation',
      'metadata.resourceVersion',
      'metadata.selfLink',
      'metadata.uid',
      'metadata.managedFields',
    ];

    readOnlyFields.forEach((path) => {
      const parts = path.split('.');
      let current = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]]) {
          current = current[parts[i]];
        } else {
          return;
        }
      }
      delete current[parts[parts.length - 1]];
    });
  }

  // Function to start auto-refreshing resources every 5 seconds
  function startAutoRefresh() {
    refreshInterval = setInterval(() => {
      if (activeResourceType && namespaceSelect.value !== undefined) {
        fetchResources(activeResourceType, namespaceSelect.value);
      }
    }, 5000); // Refresh every 5 seconds
  }

  // Function to calculate the age of a resource
  function calculateAge(creationTimestamp) {
    const creationDate = new Date(creationTimestamp);
    const now = new Date();
    const diff = now - creationDate;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  }

  // Initialize the application by loading namespaces
  loadNamespaces();
});
