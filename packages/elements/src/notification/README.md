# Notification

```live(preview)
<script>
    var el;
    var createNotification = function () {
      el = document.createElement('ef-notification');
      el.innerText = 'Notifcation received at ' + new Date().toLocaleTimeString();
      el.addEventListener('dismiss', createNotification, { once: true });
      document.body.appendChild(el);
      el.updateStyles({
        '--background-color': 'hsl(' + Math.random() * 360 + ', 50%, 50%)'
      });
    };
    createNotification();
</script>
```

Notification bar is used to show informative content when something happens in the application.

### Standard Usage

`ef-notification` allows out-of-the-box use with a set of notification methods to use within an application.

These methods work in a similar way to the ones provided by `window.console`.

> Make sure that the element and its theme is imported into your application, otherwise no notifications will be styled.

``` js
import { info, confirm, warn, error } from '@refinitiv-ui/notification/lib/helpers';

// Show an info notification
info('Info Notification');

// Show a confirmation notification
confirm('Confirmation Notification', 3000/* Show for 3 seconds */);

// Show a warning notification
warn('Warning Notification', 5000/* Show for 5 seconds */);

// Show an error notification
error('Error Notification', Infinity/* Show until user dismisses */);
```

### Inserting HTML

When using the notification methods provided by the module, you can gain access to the created element by using the returned result.

``` js
import { info } from '@refinitiv-ui/notification';

const notification = info('Info Notification');

notification.innerHTML = 'Hello <strong>World</strong>!';
```

### Using a custom background color

Custom background colors can be set using the `--background-color` variable.

```live
<style>
ef-notification {
  --background-color: #3344ff;
}
</style>
<ef-notification>I'm a custom color!</ef-notification>
```

``` css
ef-notification {
  --background-color: #3344ff;
}
```

### Custom use of notifications

This element can be used natively, like any other element. Using notifications this way requires you to manage and position the element correctly within your application.

```live
<ef-notification>Hello Everyone! 👋</ef-notification>
<ef-notification confirm>Hello Everyone! 👋</ef-notification>
<ef-notification warning>Hello Everyone! 👋</ef-notification>
<ef-notification error>Hello Everyone! 👋</ef-notification>
```

``` html
<ef-notification>Hello Everyone! 👋</ef-notification>
<ef-notification confirm>Hello Everyone! 👋</ef-notification>
<ef-notification warning>Hello Everyone! 👋</ef-notification>
<ef-notification error>Hello Everyone! 👋</ef-notification>
```

### Application Error Notifications
During development, when the application is running on localhost or 127.0.0.1, application errors will be shown as a notification. This is to aid development and highlight any errors that may occur, so that they can be addressed before the application is deployed. These error messages will not be shown when your application is hosted in a non-dev environment.