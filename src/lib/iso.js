// ISO 3166-1 countries and their ISO 4217 currencies, for creating new markets.
export const ISO_COUNTRIES = [
    ['DZ', 'Algeria', 'DZD'], ['AO', 'Angola', 'AOA'], ['BJ', 'Benin', 'XOF'], ['BW', 'Botswana', 'BWP'], ['BF', 'Burkina Faso', 'XOF'],
    ['BI', 'Burundi', 'BIF'], ['CV', 'Cabo Verde', 'CVE'], ['CM', 'Cameroon', 'XAF'], ['CF', 'Central African Republic', 'XAF'], ['TD', 'Chad', 'XAF'],
    ['KM', 'Comoros', 'KMF'], ['CD', 'Congo (DRC)', 'CDF'], ['CG', 'Congo (Republic)', 'XAF'], ['CI', "Côte d'Ivoire", 'XOF'], ['DJ', 'Djibouti', 'DJF'],
    ['EG', 'Egypt', 'EGP'], ['GQ', 'Equatorial Guinea', 'XAF'], ['ER', 'Eritrea', 'ERN'], ['SZ', 'Eswatini', 'SZL'], ['ET', 'Ethiopia', 'ETB'],
    ['GA', 'Gabon', 'XAF'], ['GM', 'Gambia', 'GMD'], ['GH', 'Ghana', 'GHS'], ['GN', 'Guinea', 'GNF'], ['GW', 'Guinea-Bissau', 'XOF'],
    ['KE', 'Kenya', 'KES'], ['LS', 'Lesotho', 'LSL'], ['LR', 'Liberia', 'LRD'], ['LY', 'Libya', 'LYD'], ['MG', 'Madagascar', 'MGA'],
    ['MW', 'Malawi', 'MWK'], ['ML', 'Mali', 'XOF'], ['MR', 'Mauritania', 'MRU'], ['MU', 'Mauritius', 'MUR'], ['MA', 'Morocco', 'MAD'],
    ['MZ', 'Mozambique', 'MZN'], ['NA', 'Namibia', 'NAD'], ['NE', 'Niger', 'XOF'], ['NG', 'Nigeria', 'NGN'], ['RW', 'Rwanda', 'RWF'],
    ['ST', 'São Tomé and Príncipe', 'STN'], ['SN', 'Senegal', 'XOF'], ['SC', 'Seychelles', 'SCR'], ['SL', 'Sierra Leone', 'SLE'], ['SO', 'Somalia', 'SOS'],
    ['ZA', 'South Africa', 'ZAR'], ['SS', 'South Sudan', 'SSP'], ['SD', 'Sudan', 'SDG'], ['TZ', 'Tanzania', 'TZS'], ['TG', 'Togo', 'XOF'],
    ['TN', 'Tunisia', 'TND'], ['UG', 'Uganda', 'UGX'], ['ZM', 'Zambia', 'ZMW'], ['ZW', 'Zimbabwe', 'ZWG'],
    ['AE', 'United Arab Emirates', 'AED'], ['CN', 'China', 'CNY'], ['GB', 'United Kingdom', 'GBP'], ['IN', 'India', 'INR'], ['US', 'United States', 'USD'],
].map(([code, name, currency]) => ({ code, name, currency }));

export const ISO_CURRENCIES = [...new Set([...ISO_COUNTRIES.map(c => c.currency), 'USD', 'EUR', 'GBP', 'ZAR', 'CNY'])].sort();
