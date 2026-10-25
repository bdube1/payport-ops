import { ThemeProvider as MuiThemeProvider } from '@mui/material';
import { buildMuiTheme } from '../lib/muiTheme';
import React, { useState, useEffect } from 'react';
import {
    Box, Button, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Typography,
    Chip, IconButton, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, MenuItem, Select, FormControl,
    InputLabel, Switch, FormControlLabel, Alert, Snackbar,
    CircularProgress, Tabs, Tab, Tooltip
} from '@mui/material';
import {
    CloudUpload, Edit, Delete, Visibility, VisibilityOff,
    Refresh, CheckCircle, Cancel, Download, ContentCopy,
    Save
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';

// MUI (only this page uses it) loads with the page, not with the whole console.
export default function BundleManagerPage() {
    const { dark } = useTheme();
    const muiTheme = React.useMemo(() => buildMuiTheme(dark), [dark]);
    return <MuiThemeProvider theme={muiTheme}><BundleManager /></MuiThemeProvider>;
}

function BundleManager() {
    const { dark } = useTheme();

    const [provider, setProvider] = useState('ECONET');
    const [bundles, setBundles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploadDialog, setUploadDialog] = useState(false);
    const [editDialog, setEditDialog] = useState(false);
    const [viewDialog, setViewDialog] = useState(false);
    const [templateDialog, setTemplateDialog] = useState(false);
    const [selectedBundle, setSelectedBundle] = useState(null);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [activeTab, setActiveTab] = useState(0);
    const [categories, setCategories] = useState([]);
    const [manualEntry, setManualEntry] = useState({
        bundleCode: '',
        bundleName: '',
        category: 'DATA',
        priceUsdCents: '',
        priceZwgCents: '',
        dataVolumeMb: '',
        validityDays: '',
        validityHours: '',
        includesSms: '',
        includesVoiceMinutes: '',
        description: ''
    });
    const [manualDialog, setManualDialog] = useState(false);

    useEffect(() => {
        fetchBundles();
        fetchCategories();
    }, [provider]);

    const fetchBundles = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/bundles/${provider}?currency=USD`);
            setBundles(response.data || []);
        } catch (error) {
            showSnackbar('Failed to load bundles', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await api.get(`/bundles/${provider}/categories`);
            setCategories(response.data || []);
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    const handleFileUpload = async () => {
        if (!uploadFile) return;

        setUploadProgress(true);
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('provider', provider);
        formData.append('version', new Date().toISOString().split('T')[0]);

        try {
            const response = await api.post('/bundles/admin/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showSnackbar(
                `Uploaded: ${response.data.processed} bundles, ${response.data.deactivated} deactivated`,
                'success'
            );
            setUploadDialog(false);
            setUploadFile(null);
            fetchBundles();
        } catch (error) {
            showSnackbar('Upload failed: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setUploadProgress(false);
        }
    };

    const handleManualAdd = async () => {
        try {
            if (!manualEntry.bundleCode || !manualEntry.bundleName || !manualEntry.category || !manualEntry.priceUsdCents) {
                showSnackbar('Bundle Code, Name, Category, and USD Price are required', 'error');
                return;
            }

            await api.post(`/bundles/admin/${provider}/create`, {
                bundleCode: manualEntry.bundleCode,
                bundleName: manualEntry.bundleName,
                category: manualEntry.category,
                priceUsdCents: Math.round(parseFloat(manualEntry.priceUsdCents) * 100),
                priceZwgCents: manualEntry.priceZwgCents ? Math.round(parseFloat(manualEntry.priceZwgCents) * 100) : null,
                dataVolumeMb: manualEntry.dataVolumeMb ? parseInt(manualEntry.dataVolumeMb) : null,
                validityDays: manualEntry.validityDays ? parseInt(manualEntry.validityDays) : null,
                validityHours: manualEntry.validityHours ? parseInt(manualEntry.validityHours) : null,
                includesSms: manualEntry.includesSms ? parseInt(manualEntry.includesSms) : null,
                includesVoiceMinutes: manualEntry.includesVoiceMinutes ? parseInt(manualEntry.includesVoiceMinutes) : null,
                description: manualEntry.description,
                isActive: true
            });

            showSnackbar('Bundle added successfully', 'success');
            setManualDialog(false);
            setManualEntry({
                bundleCode: '',
                bundleName: '',
                category: 'DATA',
                priceUsdCents: '',
                priceZwgCents: '',
                dataVolumeMb: '',
                validityDays: '',
                validityHours: '',
                includesSms: '',
                includesVoiceMinutes: '',
                description: ''
            });
            fetchBundles();
        } catch (error) {
            showSnackbar('Failed to add bundle: ' + (error.response?.data?.message || error.message), 'error');
        }
    };

    const handleUpdateBundle = async () => {
        if (!selectedBundle) return;

        try {
            await api.put(`/bundles/admin/${provider}/code/${selectedBundle.bundleCode}`, {
                bundleName: selectedBundle.bundleName,
                category: selectedBundle.category,
                priceUsdCents: Math.round(selectedBundle.priceUsdCents),
                priceZwgCents: selectedBundle.priceZwgCents ? Math.round(selectedBundle.priceZwgCents) : null,
                dataVolumeMb: selectedBundle.dataVolumeMb,
                validityDays: selectedBundle.validityDays,
                validityHours: selectedBundle.validityHours,
                includesSms: selectedBundle.includesSms,
                includesVoiceMinutes: selectedBundle.includesVoiceMinutes,
                description: selectedBundle.description,
                isActive: selectedBundle.isActive,
                reason: 'Manual update from ops portal'
            });

            showSnackbar('Bundle updated successfully', 'success');
            setEditDialog(false);
            fetchBundles();
        } catch (error) {
            showSnackbar('Failed to update bundle: ' + (error.response?.data?.message || error.message), 'error');
        }
    };

    const handleToggleActive = async (bundle) => {
        if (!window.confirm(`Are you sure you want to switch ${bundle.isActive ? 'off' : 'on'} ${bundle.bundleName || bundle.name || 'this bundle'}?`)) return;
        try {
            setLoading(true);

            // Create update payload with the opposite of current status
            const updatePayload = {
                isActive: !bundle.isActive,
                reason: bundle.isActive ? 'Deactivated from ops portal' : 'Reactivated from ops portal'
            };

            // Send update request
            await api.put(`/bundles/admin/${provider}/code/${bundle.bundleCode}`, updatePayload);

            showSnackbar(
                bundle.isActive ? 'Bundle deactivated successfully' : 'Bundle activated successfully',
                'success'
            );

            // Refresh the list to show updated status
            fetchBundles();
        } catch (error) {
            console.error('Toggle error:', error);
            showSnackbar(
                'Failed to update bundle status: ' + (error.response?.data?.message || error.message),
                'error'
            );
        } finally {
            setLoading(false);
        }
    };

    const downloadTemplate = () => {
        const templateData = [
            {
                'bundle_code': 'DDBUS1',
                'bundle_name': 'Daily 300MB + 30 SMS',
                'category': 'DATA',
                'price_usd': '1.50',
                'price_zwg': '15.00',
                'data_volume_mb': '300',
                'validity_days': '1',
                'validity_hours': '',
                'includes_sms': '30',
                'includes_voice_minutes': '',
                'description': 'Daily data bundle with SMS'
            },
            {
                'bundle_code': 'DWBUS2',
                'bundle_name': 'Weekly 500MB',
                'category': 'DATA',
                'price_usd': '3.00',
                'price_zwg': '30.00',
                'data_volume_mb': '500',
                'validity_days': '7',
                'validity_hours': '',
                'includes_sms': '',
                'includes_voice_minutes': '',
                'description': 'Weekly data bundle'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Bundles');

        const instructionsData = [
            { Field: 'bundle_code', Description: 'Unique bundle code', Required: 'Yes' },
            { Field: 'bundle_name', Description: 'Display name', Required: 'Yes' },
            { Field: 'category', Description: 'DATA, VOICE, SMS, WHATSAPP_BUNDLES', Required: 'Yes' },
            { Field: 'price_usd', Description: 'Price in USD (e.g., 1.50)', Required: 'Yes' },
            { Field: 'price_zwg', Description: 'Price in ZiG', Required: 'No' },
            { Field: 'data_volume_mb', Description: 'Data volume in MB', Required: 'For DATA' },
            { Field: 'validity_days', Description: 'Validity in days', Required: 'If not hourly' },
            { Field: 'validity_hours', Description: 'Validity in hours', Required: 'If not daily' },
            { Field: 'includes_sms', Description: 'SMS included', Required: 'No' },
            { Field: 'includes_voice_minutes', Description: 'Voice minutes', Required: 'No' },
            { Field: 'description', Description: 'Description', Required: 'No' }
        ];

        const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
        XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

        XLSX.writeFile(wb, `econet_bundles_template_${new Date().toISOString().split('T')[0]}.xlsx`);
        setTemplateDialog(false);
        showSnackbar('Template downloaded successfully', 'success');
    };

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const { getRootProps, getInputProps } = useDropzone({
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        },
        onDrop: (acceptedFiles) => setUploadFile(acceptedFiles[0])
    });

    const filteredBundles = activeTab === 0
        ? bundles
        : bundles.filter(b => b.category === categories[activeTab - 1]);

    const textColor = 'var(--text)';
    const mutedColor = 'var(--text-2)';

    return (
        <Box sx={{ p: 3, color: textColor }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: textColor }}>
                    Bundle Manager
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={fetchBundles}
                        sx={{ color: textColor, borderColor: 'var(--border)' }}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={() => setTemplateDialog(true)}
                        sx={{ color: textColor, borderColor: 'var(--border)' }}
                    >
                        Template
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<ContentCopy />}
                        onClick={() => setManualDialog(true)}
                        sx={{ color: textColor, borderColor: 'var(--border)' }}
                    >
                        Add Manual
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<CloudUpload />}
                        onClick={() => setUploadDialog(true)}
                    >
                        Upload Excel
                    </Button>
                </Box>
            </Box>

            {/* Provider Selector */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'var(--bg-card)', color: textColor }}>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel sx={{ color: mutedColor }}>Provider</InputLabel>
                    <Select
                        value={provider}
                        label="Provider"
                        onChange={(e) => setProvider(e.target.value)}
                        sx={{ color: textColor }}
                    >
                        <MenuItem value="ECONET">Econet Wireless</MenuItem>
                        <MenuItem value="NETONE">NetOne</MenuItem>
                        <MenuItem value="TELECEL">Telecel</MenuItem>
                    </Select>
                </FormControl>
            </Paper>

            {/* Category Tabs */}
            <Paper sx={{ mb: 2, bgcolor: 'var(--bg-card)' }}>
                <Tabs
                    value={activeTab}
                    onChange={(e, v) => setActiveTab(v)}
                    textColor={dark ? 'inherit' : 'primary'}
                    indicatorColor="primary"
                    sx={{
                        '& .MuiTab-root': { color: mutedColor },
                        '& .Mui-selected': { color: 'var(--blue)' }
                    }}
                >
                    <Tab label="All Bundles" />
                    {categories.map(cat => (
                        <Tab key={cat} label={cat} />
                    ))}
                </Tabs>
            </Paper>

            {/* Bundles Table */}
            <TableContainer component={Paper} sx={{ bgcolor: 'var(--bg-card)' }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: 'var(--bg-2)' }}>
                            <TableCell sx={{ color: textColor }}>Code</TableCell>
                            <TableCell sx={{ color: textColor }}>Name</TableCell>
                            <TableCell sx={{ color: textColor }}>Category</TableCell>
                            <TableCell align="right" sx={{ color: textColor }}>USD</TableCell>
                            <TableCell align="right" sx={{ color: textColor }}>ZiG</TableCell>
                            <TableCell sx={{ color: textColor }}>Validity</TableCell>
                            <TableCell sx={{ color: textColor }}>Data</TableCell>
                            <TableCell align="center" sx={{ color: textColor }}>Status</TableCell>
                            <TableCell align="center" sx={{ color: textColor }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                                    <CircularProgress />
                                </TableCell>
                            </TableRow>
                        ) : filteredBundles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                                    <Typography color={mutedColor}>
                                        No bundles found. Add manually or upload Excel.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredBundles.map((bundle) => (
                                <TableRow key={bundle.bundleCode} hover>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: textColor }}>
                                            {bundle.bundleCode}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ color: textColor }}>{bundle.bundleName}</TableCell>
                                    <TableCell>
                                        <Chip label={bundle.category} size="small" />
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: textColor }}>
                                        ${(bundle.priceValue || 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: 'var(--amber)' }}>
                                        ZiG {(bundle.priceZwgCents ? bundle.priceZwgCents/100 : 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell sx={{ color: mutedColor }}>{bundle.validity || '—'}</TableCell>
                                    <TableCell sx={{ color: mutedColor }}>{bundle.dataVolume || '—'}</TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            icon={bundle.isActive ? <CheckCircle /> : <Cancel />}
                                            label={bundle.isActive ? 'Active' : 'Inactive'}
                                            color={bundle.isActive ? 'success' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="View Details">
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    setSelectedBundle({...bundle});
                                                    setViewDialog(true);
                                                }}
                                                sx={{ color: textColor }}
                                            >
                                                <Visibility fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Edit Bundle">
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    setSelectedBundle({...bundle});
                                                    setEditDialog(true);
                                                }}
                                                sx={{ color: textColor }}
                                            >
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={bundle.isActive ? 'Deactivate' : 'Activate'}>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleToggleActive(bundle)}
                                                sx={{
                                                    color: bundle.isActive ? 'var(--red)' : 'var(--green)',
                                                    '&:hover': {
                                                        backgroundColor: bundle.isActive ? 'rgba(242, 139, 139, 0.1)' : 'rgba(76, 175, 80, 0.1)'
                                                    }
                                                }}
                                            >
                                                {bundle.isActive ? <VisibilityOff fontSize="small" /> : <CheckCircle fontSize="small" />}
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* View Dialog */}
            <Dialog
                open={viewDialog}
                onClose={() => setViewDialog(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { bgcolor: 'var(--bg-card)', color: textColor } }}
            >
                <DialogTitle sx={{ color: textColor }}>Bundle Details</DialogTitle>
                <DialogContent>
                    {selectedBundle && (
                        <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <Typography><strong>Code:</strong> {selectedBundle.bundleCode}</Typography>
                            <Typography><strong>Name:</strong> {selectedBundle.bundleName}</Typography>
                            <Typography><strong>Category:</strong> {selectedBundle.category}</Typography>
                            <Typography><strong>USD Price:</strong> ${(selectedBundle.priceValue || 0).toFixed(2)}</Typography>
                            <Typography><strong>ZiG Price:</strong> ZiG {(selectedBundle.priceZwgCents ? selectedBundle.priceZwgCents/100 : 0).toFixed(2)}</Typography>
                            <Typography><strong>Data Volume:</strong> {selectedBundle.dataVolume || 'N/A'}</Typography>
                            <Typography><strong>Validity:</strong> {selectedBundle.validity || 'N/A'}</Typography>
                            <Typography><strong>SMS:</strong> {selectedBundle.includesSms || '0'}</Typography>
                            <Typography><strong>Voice:</strong> {selectedBundle.includesVoiceMinutes || '0'} mins</Typography>
                            <Typography><strong>Status:</strong> {selectedBundle.isActive ? 'Active' : 'Inactive'}</Typography>
                            <Typography sx={{ gridColumn: 'span 2' }}><strong>Description:</strong> {selectedBundle.description || '—'}</Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog
                open={editDialog}
                onClose={() => setEditDialog(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { bgcolor: 'var(--bg-card)', color: textColor } }}
            >
                <DialogTitle sx={{ color: textColor }}>Edit Bundle</DialogTitle>
                <DialogContent>
                    {selectedBundle && (
                        <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField
                                label="Bundle Code"
                                value={selectedBundle.bundleCode}
                                disabled
                                fullWidth
                                size="small"
                            />
                            <TextField
                                label="Bundle Name"
                                value={selectedBundle.bundleName || ''}
                                onChange={(e) => setSelectedBundle({...selectedBundle, bundleName: e.target.value})}
                                fullWidth
                                size="small"
                            />
                            <FormControl fullWidth size="small">
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={selectedBundle.category || 'DATA'}
                                    label="Category"
                                    onChange={(e) => setSelectedBundle({...selectedBundle, category: e.target.value})}
                                >
                                    <MenuItem value="DATA">DATA</MenuItem>
                                    <MenuItem value="VOICE">VOICE</MenuItem>
                                    <MenuItem value="SMS">SMS</MenuItem>
                                    <MenuItem value="WHATSAPP_BUNDLES">WHATSAPP</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField
                                label="USD Price (cents)"
                                type="number"
                                value={selectedBundle.priceUsdCents || ''}
                                onChange={(e) => setSelectedBundle({...selectedBundle, priceUsdCents: parseInt(e.target.value)})}
                                fullWidth
                                size="small"
                                helperText={`$${(selectedBundle.priceUsdCents/100 || 0).toFixed(2)}`}
                            />
                            <TextField
                                label="ZiG Price (cents)"
                                type="number"
                                value={selectedBundle.priceZwgCents || ''}
                                onChange={(e) => setSelectedBundle({...selectedBundle, priceZwgCents: parseInt(e.target.value)})}
                                fullWidth
                                size="small"
                                helperText={`ZiG ${(selectedBundle.priceZwgCents/100 || 0).toFixed(2)}`}
                            />
                            <TextField
                                label="Data Volume (MB)"
                                type="number"
                                value={selectedBundle.dataVolumeMb || ''}
                                onChange={(e) => setSelectedBundle({...selectedBundle, dataVolumeMb: parseInt(e.target.value)})}
                                fullWidth
                                size="small"
                            />
                            <TextField
                                label="Validity Days"
                                type="number"
                                value={selectedBundle.validityDays || ''}
                                onChange={(e) => setSelectedBundle({...selectedBundle, validityDays: parseInt(e.target.value)})}
                                fullWidth
                                size="small"
                            />
                            <TextField
                                label="Validity Hours"
                                type="number"
                                value={selectedBundle.validityHours || ''}
                                onChange={(e) => setSelectedBundle({...selectedBundle, validityHours: parseInt(e.target.value)})}
                                fullWidth
                                size="small"
                            />
                            <TextField
                                label="Includes SMS"
                                type="number"
                                value={selectedBundle.includesSms || ''}
                                onChange={(e) => setSelectedBundle({...selectedBundle, includesSms: parseInt(e.target.value)})}
                                fullWidth
                                size="small"
                            />
                            <TextField
                                label="Voice Minutes"
                                type="number"
                                value={selectedBundle.includesVoiceMinutes || ''}
                                onChange={(e) => setSelectedBundle({...selectedBundle, includesVoiceMinutes: parseInt(e.target.value)})}
                                fullWidth
                                size="small"
                            />
                            <TextField
                                label="Description"
                                value={selectedBundle.description || ''}
                                onChange={(e) => setSelectedBundle({...selectedBundle, description: e.target.value})}
                                fullWidth
                                size="small"
                                multiline
                                rows={2}
                                sx={{ gridColumn: 'span 2' }}
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={selectedBundle.isActive}
                                        onChange={(e) => setSelectedBundle({...selectedBundle, isActive: e.target.checked})}
                                    />
                                }
                                label="Active"
                                sx={{ gridColumn: 'span 2' }}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialog(false)}>Cancel</Button>
                    <Button onClick={handleUpdateBundle} variant="contained" startIcon={<Save />}>
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Manual Entry Dialog */}
            <Dialog
                open={manualDialog}
                onClose={() => setManualDialog(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { bgcolor: 'var(--bg-card)', color: textColor } }}
            >
                <DialogTitle sx={{ color: textColor }}>Add Bundle Manually</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <TextField
                            label="Bundle Code *"
                            value={manualEntry.bundleCode}
                            onChange={(e) => setManualEntry({...manualEntry, bundleCode: e.target.value})}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Bundle Name *"
                            value={manualEntry.bundleName}
                            onChange={(e) => setManualEntry({...manualEntry, bundleName: e.target.value})}
                            fullWidth
                            size="small"
                        />
                        <FormControl fullWidth size="small">
                            <InputLabel>Category *</InputLabel>
                            <Select
                                value={manualEntry.category}
                                label="Category *"
                                onChange={(e) => setManualEntry({...manualEntry, category: e.target.value})}
                            >
                                <MenuItem value="DATA">DATA</MenuItem>
                                <MenuItem value="VOICE">VOICE</MenuItem>
                                <MenuItem value="SMS">SMS</MenuItem>
                                <MenuItem value="WHATSAPP_BUNDLES">WHATSAPP</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="USD Price *"
                            value={manualEntry.priceUsdCents}
                            onChange={(e) => setManualEntry({...manualEntry, priceUsdCents: e.target.value})}
                            fullWidth
                            size="small"
                           
                        />
                        <TextField
                            label="ZiG Price"
                            value={manualEntry.priceZwgCents}
                            onChange={(e) => setManualEntry({...manualEntry, priceZwgCents: e.target.value})}
                            fullWidth
                            size="small"
                           
                        />
                        <TextField
                            label="Data Volume (MB)"
                            value={manualEntry.dataVolumeMb}
                            onChange={(e) => setManualEntry({...manualEntry, dataVolumeMb: e.target.value})}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Validity Days"
                            value={manualEntry.validityDays}
                            onChange={(e) => setManualEntry({...manualEntry, validityDays: e.target.value})}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Validity Hours"
                            value={manualEntry.validityHours}
                            onChange={(e) => setManualEntry({...manualEntry, validityHours: e.target.value})}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Includes SMS"
                            value={manualEntry.includesSms}
                            onChange={(e) => setManualEntry({...manualEntry, includesSms: e.target.value})}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Voice Minutes"
                            value={manualEntry.includesVoiceMinutes}
                            onChange={(e) => setManualEntry({...manualEntry, includesVoiceMinutes: e.target.value})}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Description"
                            value={manualEntry.description}
                            onChange={(e) => setManualEntry({...manualEntry, description: e.target.value})}
                            fullWidth
                            size="small"
                            multiline
                            rows={2}
                            sx={{ gridColumn: 'span 2' }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setManualDialog(false)}>Cancel</Button>
                    <Button onClick={handleManualAdd} variant="contained">
                        Add Bundle
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Upload Dialog */}
            <Dialog
                open={uploadDialog}
                onClose={() => setUploadDialog(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { bgcolor: 'var(--bg-card)', color: textColor } }}
            >
                <DialogTitle sx={{ color: textColor }}>Upload Econet Bundles</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Paper
                            {...getRootProps()}
                            sx={{
                                p: 3,
                                border: '2px dashed',
                                borderColor: uploadFile ? 'success.main' : ('var(--border)'),
                                borderRadius: 2,
                                textAlign: 'center',
                                cursor: 'pointer',
                                bgcolor: 'var(--bg-2)'
                            }}
                        >
                            <input {...getInputProps()} />
                            {uploadFile ? (
                                <>
                                    <CheckCircle color="success" sx={{ fontSize: 48, mb: 1 }} />
                                    <Typography>{uploadFile.name}</Typography>
                                </>
                            ) : (
                                <>
                                    <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                                    <Typography>Drop Excel file here</Typography>
                                </>
                            )}
                        </Paper>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUploadDialog(false)}>Cancel</Button>
                    <Button onClick={handleFileUpload} variant="contained" disabled={!uploadFile || uploadProgress}>
                        {uploadProgress ? <CircularProgress size={24} /> : 'Upload'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Template Dialog */}
            <Dialog
                open={templateDialog}
                onClose={() => setTemplateDialog(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { bgcolor: 'var(--bg-card)', color: textColor } }}
            >
                <DialogTitle>Download Template</DialogTitle>
                <DialogContent>
                    <Typography>Download an Excel template with the correct column headers.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTemplateDialog(false)}>Cancel</Button>
                    <Button onClick={downloadTemplate} variant="contained" startIcon={<Download />}>
                        Download
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}