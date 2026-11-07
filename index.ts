import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import App from './App';
import { widgetTaskHandler } from './src/widget/widget-task-handler';

registerRootComponent(App);
registerWidgetTaskHandler(widgetTaskHandler);
