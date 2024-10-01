# Requirements to Run the Kubernetes Resource Editor
1. System Requirements
*  Operating System:
    * Windows, macOS, or Linux
* Node.js:
    * Version 14.x or higher
* npm (Node Package Manager):
    * Comes with Node.js, but ensure it’s updated.
2. Software Dependencies
You will need the following software and libraries installed on your machine:
* Node.js: Install Node.js from the official website:
* Kubernetes CLI (kubectl):
* Kubernetes Cluster:

3. Install Application Dependencies
Navigate to your project directory and run the following command to install the required Node.js packages
```
npm install
```
5. Update Kubernetes Configuration
* Ensure your Kubernetes configuration file is correctly set up. Typically, this is located at `~/.kube/config`. This file should allow access to your Kubernetes cluster.
6. Run the Application
* To start the application, run:
```
npx electron .
```
7. Access the Application
* The application should open in a new window, typically running in an Electron environment.
## Additional Notes
* Permissions: Ensure your Kubernetes user has the appropriate permissions to list and manage Pods, Deployments, StatefulSets, DaemonSets, Services, Secrets, and ConfigMaps in the namespaces you wish to work with.
* Error Handling: If you encounter issues related to API access or resource fetching, check your Kubernetes context and permissions.
## Sample Documentation for Setup
Below is a sample documentation format you can use for your README file or internal documentation:

<img width="1750" alt="Screenshot 2024-10-01 at 16 57 30" src="https://github.com/user-attachments/assets/7e6a9f3d-6c7d-4861-b7e2-6b115c7d916e">
