# Connecting to Docker

0. Clone the github repo onto your local machine

1. Downlaod the "Dev Containers" extension for VSCode (ms-vscode-remote.remote-containers)

2. Open a new VS Code window and close all others. In this window open the repository folder. It is important you open the folder called Natural-Highs and not any other

3. Comment out this line in .devcontainer/Dockerfile

![alt text](image-2.png)

4. Click on the two angled brackets in the bottom left

![alt text](image.png)

5. Click Reopen in Container

![alt text](image-1.png)

6. VSCode Should reopen from inside your docker container

7. Run "npm i" in the terminal

8. create a file called .env and paste the contents from the pinned message in discord in

9. run "npm run dev" in the terminal

10. click on the local host link in your terminal and if you are brought to a log in page then every thing is working.

11. Make sure to uncomment that line in the Dockerfile after everything starts working

### Optional: Install the Peacock extension (johnpapa.vscode-peacock) to "Subtly change the color of your Visual Studio Code workspace."

# Starting the Project

1. Start the emulator with "firebase emulators:start"
2. If you have any errorrs try "npm install -g firebase-tools && apt install -y default-jdk && npm install firebase-admin"
3. You can now connect to http://127.0.0.1:4000/ to view a ui for the db and auth
4. This eventually will be automated
5. "npm run dev" to start the project
