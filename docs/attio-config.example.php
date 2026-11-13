<?php
/**
 * Example Attio config for the website enquiry handler.
 *
 * Copy this file to attio-config.php OUTSIDE the web root (never inside
 * public_html, and never into this repository). enquiry.php checks, in order:
 *   1. the ATTIO_CONFIG_PATH environment variable
 *   2. the directory above the site root (the folder above public_html)
 *   3. the directory above that
 *
 * Fill in the real token only on the server copy. This example has no secret.
 * File mode 0600 on the server copy if you can.
 *
 * Create the access token in Attio: Workspace settings → Developers.
 * Required scopes:
 *   record_permission:read-write
 *   object_configuration:read
 *   list_entry:read-write
 *   list_configuration:read
 *   note:read-write
 */

declare(strict_types=1);

return [
    'attio_access_token' => 'replace-with-your-attio-access-token',
    'list_slug' => 'website_enquiries',
    // Optional. Defaults to https://api.attio.com. Point this at a mock for offline tests.
    // 'attio_base_url' => 'https://api.attio.com',
];
