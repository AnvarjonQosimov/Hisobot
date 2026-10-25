# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Admin dashboard

The standalone admin dashboard is available to `anvarqosimov153@gmail.com`. It reports registered users, authorized boss accounts, and email-linked workers per boss. The admin can grant or revoke boss access; users continue to sign in with Google.

The admin dashboard reads and updates the Firestore collections directly after verifying the signed-in Google email.

## Firestore access rules

Firestore rules are defined in `firestore.rules` and attached through `firebase.json` for the `loginforofficereport` project. Access requires a verified Google email. The administrator `anvarqosimov153@gmail.com` can access all application documents; an approved boss can access only their cabinet and worker records. Unmatched users are denied.

Workers no longer read the boss's full cabinet. After a worker enters a valid invite code, `workerAccess/{workerEmail}` links that authenticated account to one worker record in `workerData`. The boss's report page synchronizes worker records to that collection and removes records that are deleted from the boss's list.

For a safe rollout, publish the updated application first and have each boss open the report page once so their worker records are synchronized while the existing Firestore rules are still active. Then publish the new rules. Workers should sign in again and enter their invite code once to establish their individual access record. Publishing the rules before these steps can temporarily prevent workers from seeing their data.

The rules have not been deployed to Firebase. To publish them after the rollout, use the Firebase Console or run `firebase deploy --only firestore:rules --project loginforofficereport` from a machine authenticated to that project.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
