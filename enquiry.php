<?php
/**
 * FlowBuildr website enquiry form handler.
 *
 * Accepts the book-a-call form as JSON (or form-encoded as a fallback),
 * writes the lead to Attio, and always responds with JSON.
 * Keep this file in public_html. Secrets live in attio-config.php, which
 * must stay outside the web root. Lookup order:
 *   1. ATTIO_CONFIG_PATH environment variable
 *   2. dirname(__DIR__) . '/attio-config.php' (the folder above public_html)
 *   3. dirname(__DIR__, 2) . '/attio-config.php'
 */

declare(strict_types=1);

ini_set('display_errors', '0');
ini_set('log_errors', '1');

// ---------------------------------------------------------------------------
// Field names — remap these if the payload keys change.
// ---------------------------------------------------------------------------

const FIELD_FIRST_NAME = 'first_name';
const FIELD_LAST_NAME = 'last_name';
const FIELD_EMAIL = 'email';
const FIELD_PHONE = 'phone';
const FIELD_BUSINESS_NAME = 'business_name';
const FIELD_MESSAGE = 'message';
const FIELD_SOURCE = 'source';
const FIELD_HONEYPOT = 'company_website';

const MAX_NAME_PART = 100;
const MAX_EMAIL = 254;
const MAX_PHONE = 40;
const MAX_COMPANY = 200;
const MAX_MESSAGE = 10000;
const MAX_SOURCE = 200;

const DEFAULT_ATTIO_BASE = 'https://api.attio.com';
const CURL_TIMEOUT_SECONDS = 15;

// List entry values applied only when the person is new to the list.
const NEW_ENTRY_STAGE = 'New enquiry';
const NEW_ENTRY_SOURCE = 'Website form';

const DEFAULT_PHONE_COUNTRY = 'GB';

const ALLOWED_ORIGINS = [
    'https://flowbuildr.co.uk',
    'https://www.flowbuildr.co.uk',
];

const CONSUMER_EMAIL_DOMAINS = [
    'gmail.com', 'googlemail.com',
    'outlook.com', 'outlook.co.uk', 'hotmail.com', 'hotmail.co.uk',
    'live.com', 'live.co.uk', 'msn.com',
    'yahoo.com', 'yahoo.co.uk', 'ymail.com',
    'icloud.com', 'me.com', 'mac.com',
    'aol.com', 'proton.me', 'protonmail.com',
    'gmx.com', 'gmx.co.uk', 'mail.com', 'zoho.com', 'yandex.com',
    'btinternet.com', 'sky.com', 'virginmedia.com', 'blueyonder.co.uk',
    'ntlworld.com', 'talktalk.net', 'tiscali.co.uk',
];

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

apply_cors();

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($method === 'OPTIONS') {
    http_response_code(204);
    header('Allow: POST, OPTIONS');
    exit;
}

if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    respond_error('Please submit the form to send an enquiry.', 405);
}

$input = read_input();
if ($input === null) {
    respond_error('Please send a valid enquiry.', 400);
}

if (input_value($input, FIELD_HONEYPOT) !== '') {
    // Likely a bot. Look like a success and do not write to Attio.
    respond_success();
}

$firstName = input_value($input, FIELD_FIRST_NAME);
$lastName = input_value($input, FIELD_LAST_NAME);
$email = input_value($input, FIELD_EMAIL);
$phone = input_value($input, FIELD_PHONE);
$businessName = input_value($input, FIELD_BUSINESS_NAME);
$message = input_value($input, FIELD_MESSAGE);
$source = input_value($input, FIELD_SOURCE);

$errors = validate_input($firstName, $lastName, $email, $phone, $businessName, $message, $source);
if ($errors) {
    respond_error(implode(' ', $errors), 400);
}

try {
    $config = load_config();
    process_enquiry($config, $firstName, $lastName, $email, $phone, $businessName, $message, $source);
} catch (Throwable $e) {
    error_log('Enquiry form: ' . $e->getMessage());
    respond_error(
        'Sorry, we could not send your enquiry just now. Please try again in a moment, or email us directly.',
        500
    );
}

respond_success();

// ---------------------------------------------------------------------------
// Core flow
// ---------------------------------------------------------------------------

function process_enquiry(
    array $config,
    string $firstName,
    string $lastName,
    string $email,
    string $phone,
    string $businessName,
    string $message,
    string $source
): void {
    $token = $config['attio_access_token'];
    $listSlug = $config['list_slug'];
    $fullName = trim($firstName . ' ' . $lastName);

    $companyId = resolve_company($token, $businessName, $email);
    $personId = upsert_person($token, $firstName, $lastName, $fullName, $email, $phone, $companyId);
    upsert_list_entry_if_new($token, $listSlug, $personId);
    create_enquiry_note($token, $personId, $fullName, $email, $phone, $businessName, $message, $source);
}

function resolve_company(string $token, string $businessName, string $email): ?string
{
    $domain = work_email_domain($email);

    if ($domain !== null) {
        $values = [
            'domains' => [['domain' => $domain]],
        ];
        if ($businessName !== '') {
            $values['name'] = [['value' => $businessName]];
        } else {
            $values['name'] = [['value' => domain_as_name($domain)]];
        }

        $response = attio_request(
            $token,
            'PUT',
            '/v2/objects/companies/records?matching_attribute=domains',
            ['data' => ['values' => $values]]
        );
        $id = $response['data']['id']['record_id'] ?? null;
        if (!is_string($id) || $id === '') {
            throw new RuntimeException('Attio company upsert did not return a record id.');
        }
        return $id;
    }

    if ($businessName === '') {
        return null;
    }

    // No unique domain to match on, so look up by exact name, then create if needed.
    $existing = find_company_by_name($token, $businessName);
    if ($existing !== null) {
        return $existing;
    }

    $response = attio_request(
        $token,
        'POST',
        '/v2/objects/companies/records',
        ['data' => ['values' => ['name' => [['value' => $businessName]]]]]
    );
    $id = $response['data']['id']['record_id'] ?? null;
    if (!is_string($id) || $id === '') {
        throw new RuntimeException('Attio company create did not return a record id.');
    }
    return $id;
}

function find_company_by_name(string $token, string $businessName): ?string
{
    try {
        $response = attio_request(
            $token,
            'POST',
            '/v2/objects/companies/records/query',
            [
                'filter' => ['name' => $businessName],
                'limit' => 5,
            ]
        );
    } catch (RuntimeException $e) {
        error_log('Enquiry form: company name lookup failed: ' . $e->getMessage());
        return null;
    }

    $records = $response['data'] ?? [];
    if (!is_array($records) || $records === []) {
        return null;
    }

    if (count($records) > 1) {
        error_log('Enquiry form: more than one company matched name "' . $businessName . '"; linking the first.');
    }

    $id = $records[0]['id']['record_id'] ?? null;
    return is_string($id) && $id !== '' ? $id : null;
}

function upsert_person(
    string $token,
    string $firstName,
    string $lastName,
    string $fullName,
    string $email,
    string $phone,
    ?string $companyId
): string {
    $values = [
        'email_addresses' => [['email_address' => $email]],
        'name' => [[
            'first_name' => $firstName,
            'last_name' => $lastName,
            'full_name' => $fullName,
        ]],
    ];

    if ($phone !== '') {
        $values['phone_numbers'] = [[
            'original_phone_number' => $phone,
            'country_code' => DEFAULT_PHONE_COUNTRY,
        ]];
    }

    if ($companyId !== null) {
        $values['company'] = [[
            'target_object' => 'companies',
            'target_record_id' => $companyId,
        ]];
    }

    $response = attio_request(
        $token,
        'PUT',
        '/v2/objects/people/records?matching_attribute=email_addresses',
        ['data' => ['values' => $values]]
    );

    $id = $response['data']['id']['record_id'] ?? null;
    if (!is_string($id) || $id === '') {
        throw new RuntimeException('Attio person upsert did not return a record id.');
    }
    return $id;
}

function upsert_list_entry_if_new(string $token, string $listSlug, string $personId): void
{
    $path = '/v2/lists/' . rawurlencode($listSlug) . '/entries';

    // Upsert by parent so a repeat submission does not create a second entry.
    // Empty entry_values leaves any existing stage and source unchanged.
    $response = attio_request($token, 'PUT', $path, [
        'data' => [
            'parent_record_id' => $personId,
            'parent_object' => 'people',
            'entry_values' => new stdClass(),
        ],
    ]);

    $entryId = $response['data']['id']['entry_id'] ?? null;
    $createdAt = $response['data']['created_at'] ?? null;
    if (!is_string($entryId) || $entryId === '') {
        throw new RuntimeException('Attio list upsert did not return an entry id.');
    }

    if (!is_new_list_entry($createdAt)) {
        return;
    }

    try {
        attio_request(
            $token,
            'PATCH',
            $path . '/' . rawurlencode($entryId),
            [
                'data' => [
                    'entry_values' => [
                        'stage' => NEW_ENTRY_STAGE,
                        'source' => NEW_ENTRY_SOURCE,
                    ],
                ],
            ]
        );
    } catch (RuntimeException $e) {
        // The person is already on the list. Do not fail the enquiry if
        // stage/source cannot be set (for example before those attributes exist).
        error_log('Enquiry form: could not set list stage/source: ' . $e->getMessage());
    }
}

function is_new_list_entry($createdAt): bool
{
    if (!is_string($createdAt) || $createdAt === '') {
        // If Attio omits created_at, do not risk resetting an existing lead.
        return false;
    }

    $created = strtotime($createdAt);
    if ($created === false) {
        error_log('Enquiry form: could not parse list entry created_at: ' . $createdAt);
        return false;
    }

    return (time() - $created) <= 30;
}

function create_enquiry_note(
    string $token,
    string $personId,
    string $fullName,
    string $email,
    string $phone,
    string $businessName,
    string $message,
    string $source
): void {
    $tz = new DateTimeZone('Europe/London');
    $now = new DateTimeImmutable('now', $tz);
    $title = 'Website enquiry, ' . $now->format('j F Y');

    $lines = [
        'Name: ' . $fullName,
        'Email: ' . $email,
        'Phone: ' . ($phone !== '' ? $phone : '(not provided)'),
        'Business: ' . ($businessName !== '' ? $businessName : '(not provided)'),
        'Source: ' . ($source !== '' ? $source : 'Website: book a call'),
        '',
    ];
    $lines[] = $message !== '' ? $message : '(no message)';

    attio_request($token, 'POST', '/v2/notes', [
        'data' => [
            'parent_object' => 'people',
            'parent_record_id' => $personId,
            'title' => $title,
            'format' => 'plaintext',
            'content' => implode("\n", $lines),
        ],
    ]);
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function attio_request(string $token, string $method, string $path, array $body): array
{
    $base = $GLOBALS['ATTIO_BASE_URL'] ?? DEFAULT_ATTIO_BASE;
    $url = rtrim($base, '/') . $path;
    $payload = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($payload === false) {
        throw new RuntimeException('Failed to encode Attio request body.');
    }

    $ch = curl_init($url);
    if ($ch === false) {
        throw new RuntimeException('Failed to start a request to Attio.');
    }

    $headers = [
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json',
        'Accept: application/json',
    ];

    $opts = [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => CURL_TIMEOUT_SECONDS,
        CURLOPT_CONNECTTIMEOUT => 8,
    ];

    if (str_starts_with(strtolower($base), 'https://')) {
        $opts[CURLOPT_SSL_VERIFYPEER] = true;
        $opts[CURLOPT_SSL_VERIFYHOST] = 2;
    }

    curl_setopt_array($ch, $opts);

    $raw = curl_exec($ch);
    $errno = curl_errno($ch);
    $error = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    if ($errno !== 0 || $raw === false) {
        throw new RuntimeException('Attio request failed (' . $method . ' ' . $path . '): ' . $error);
    }

    $decoded = json_decode((string) $raw, true);
    if ($status < 200 || $status >= 300) {
        $attioMessage = '';
        if (is_array($decoded) && isset($decoded['message']) && is_string($decoded['message'])) {
            $attioMessage = $decoded['message'];
        }
        throw new RuntimeException(
            'Attio HTTP ' . $status . ' for ' . $method . ' ' . $path
            . ($attioMessage !== '' ? ': ' . $attioMessage : '')
        );
    }

    return is_array($decoded) ? $decoded : [];
}

function config_candidates(): array
{
    $paths = [];

    $fromEnv = getenv('ATTIO_CONFIG_PATH');
    if (!is_string($fromEnv) || trim($fromEnv) === '') {
        $serverValue = $_SERVER['ATTIO_CONFIG_PATH'] ?? '';
        $fromEnv = is_string($serverValue) ? $serverValue : '';
    }
    if (trim($fromEnv) !== '') {
        $paths[] = trim($fromEnv);
    }

    // Parent of the web root (the directory above public_html on Hostinger),
    // then one level further up.
    $paths[] = dirname(__DIR__) . '/attio-config.php';
    $paths[] = dirname(__DIR__, 2) . '/attio-config.php';

    $unique = [];
    foreach ($paths as $path) {
        if (!in_array($path, $unique, true)) {
            $unique[] = $path;
        }
    }
    return $unique;
}

function load_config(): array
{
    $checked = config_candidates();
    $path = null;
    foreach ($checked as $candidate) {
        if (@is_file($candidate) && @is_readable($candidate)) {
            $path = $candidate;
            break;
        }
    }

    if ($path === null) {
        error_log('Enquiry form: no Attio config file found. Checked: ' . implode(', ', $checked));
        respond_error(
            'Sorry, the enquiry form is not available just now. Please try again later, or email us directly.',
            500
        );
    }

    try {
        $config = require $path;
    } catch (Throwable $e) {
        error_log('Enquiry form: config file could not be loaded: ' . $e->getMessage());
        respond_error(
            'Sorry, the enquiry form is not available just now. Please try again later, or email us directly.',
            500
        );
    }

    if (!is_array($config)) {
        error_log('Enquiry form: config file did not return an array.');
        respond_error(
            'Sorry, the enquiry form is not available just now. Please try again later, or email us directly.',
            500
        );
    }

    $token = isset($config['attio_access_token']) ? trim((string) $config['attio_access_token']) : '';
    $listSlug = isset($config['list_slug']) ? trim((string) $config['list_slug']) : '';
    $baseUrl = isset($config['attio_base_url']) ? trim((string) $config['attio_base_url']) : DEFAULT_ATTIO_BASE;

    if ($token === '' || $token === 'replace-with-your-attio-access-token') {
        error_log('Enquiry form: Attio access token is missing or still the placeholder.');
        respond_error(
            'Sorry, the enquiry form is not available just now. Please try again later, or email us directly.',
            500
        );
    }

    if ($listSlug === '') {
        error_log('Enquiry form: list_slug is missing.');
        respond_error(
            'Sorry, the enquiry form is not available just now. Please try again later, or email us directly.',
            500
        );
    }

    if ($baseUrl === '' || !preg_match('#^https?://#i', $baseUrl)) {
        error_log('Enquiry form: attio_base_url is invalid.');
        respond_error(
            'Sorry, the enquiry form is not available just now. Please try again later, or email us directly.',
            500
        );
    }

    $GLOBALS['ATTIO_BASE_URL'] = rtrim($baseUrl, '/');

    return [
        'attio_access_token' => $token,
        'list_slug' => $listSlug,
        'attio_base_url' => $GLOBALS['ATTIO_BASE_URL'],
    ];
}

function read_input(): ?array
{
    $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
    $raw = file_get_contents('php://input');
    if ($raw === false) {
        $raw = '';
    }

    $looksJson = str_contains($contentType, 'application/json')
        || ($raw !== '' && ($raw[0] === '{' || $raw[0] === '['));

    if ($looksJson) {
        $data = json_decode($raw, true);
        return is_array($data) ? $data : null;
    }

    return $_POST;
}

function input_value(array $input, string $key): string
{
    return isset($input[$key]) && is_scalar($input[$key]) ? trim((string) $input[$key]) : '';
}

function apply_cors(): void
{
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if (!in_array($origin, ALLOWED_ORIGINS, true)) {
        return;
    }

    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept');
    header('Access-Control-Max-Age: 86400');
}

function respond_success(): void
{
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
    }
    http_response_code(200);
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

function respond_error(string $message, int $status): void
{
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
    }
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

// ---------------------------------------------------------------------------
// Validation and formatting
// ---------------------------------------------------------------------------

function validate_input(
    string $firstName,
    string $lastName,
    string $email,
    string $phone,
    string $businessName,
    string $message,
    string $source
): array {
    $errors = [];

    if ($firstName === '' || mb_strlen($firstName) > MAX_NAME_PART) {
        $errors[] = 'Please enter your first name.';
    }

    if ($lastName === '' || mb_strlen($lastName) > MAX_NAME_PART) {
        $errors[] = 'Please enter your surname.';
    }

    if ($email === '' || mb_strlen($email) > MAX_EMAIL || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
        $errors[] = 'Please enter a valid email address.';
    }

    if ($phone !== '' && (mb_strlen($phone) > MAX_PHONE || !preg_match('/^[+\d][\d\s().-]{5,}$/', $phone))) {
        $errors[] = 'Please enter a valid phone number, or leave it blank.';
    }

    if (mb_strlen($businessName) > MAX_COMPANY) {
        $errors[] = 'Business name is too long.';
    }

    if (mb_strlen($message) > MAX_MESSAGE) {
        $errors[] = 'Your message is too long.';
    }

    if (mb_strlen($source) > MAX_SOURCE) {
        $errors[] = 'Source is too long.';
    }

    return $errors;
}

function work_email_domain(string $email): ?string
{
    $at = strrpos($email, '@');
    if ($at === false) {
        return null;
    }

    $domain = strtolower(substr($email, $at + 1));
    $domain = preg_replace('/^www\./', '', $domain) ?? $domain;

    if ($domain === '' || in_array($domain, CONSUMER_EMAIL_DOMAINS, true)) {
        return null;
    }

    return $domain;
}

function domain_as_name(string $domain): string
{
    $base = explode('.', $domain)[0];
    $base = str_replace(['-', '_'], ' ', $base);
    return ucwords($base);
}
