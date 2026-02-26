import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsApi } from '../api/transactions'
import { Upload as UploadIcon, FileSpreadsheet, Camera, CheckCircle, AlertCircle, Loader2, Plus } from 'lucide-react'
import CategoryBadge from '../components/CategoryBadge'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default function Upload() {
  const qc = useQueryClient()
  const [excelResult, setExcelResult] = useState<any>(null)
  const [ocrResult, setOcrResult] = useState<any>(null)
  const [ocrConfirmed, setOcrConfirmed] = useState(false)

  const excelMutation = useMutation({
    mutationFn: transactionsApi.uploadExcel,
    onSuccess: (res) => {
      setExcelResult(res.data)
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  const ocrMutation = useMutation({
    mutationFn: transactionsApi.uploadReceipt,
    onSuccess: (res) => setOcrResult(res.data),
  })

  const createMutation = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      setOcrConfirmed(true)
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  const onDropExcel = useCallback((files: File[]) => {
    if (files[0]) excelMutation.mutate(files[0])
  }, [])

  const onDropReceipt = useCallback((files: File[]) => {
    if (files[0]) ocrMutation.mutate(files[0])
  }, [])

  const { getRootProps: getExcelProps, getInputProps: getExcelInput, isDragActive: excelDrag } = useDropzone({
    onDrop: onDropExcel,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
    multiple: false,
  })

  const { getRootProps: getReceiptProps, getInputProps: getReceiptInput, isDragActive: receiptDrag } = useDropzone({
    onDrop: onDropReceipt,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    multiple: false,
  })

  const confirmOcr = () => {
    if (!ocrResult?.draft_transaction) return
    const draft = ocrResult.draft_transaction
    createMutation.mutate({
      amount: draft.amount || 0,
      type: draft.type || 'expense',
      description: draft.description || 'Receipt upload',
      date: draft.date || new Date().toISOString().slice(0, 10),
      category: draft.category || 'Other',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload</h1>
        <p className="text-slate-400 text-sm mt-1">Import transactions from Excel or scan receipts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Excel Upload */}
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <FileSpreadsheet size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold">Excel Import</h2>
              <p className="text-xs text-slate-400">Bulk import from .xlsx or .xls file</p>
            </div>
          </div>

          <div
            {...getExcelProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              excelDrag
                ? 'border-emerald-500 bg-emerald-500/5'
                : 'border-slate-700 hover:border-slate-600'
            }`}
          >
            <input {...getExcelInput()} />
            {excelMutation.isPending ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={28} className="animate-spin text-violet-400" />
                <p className="text-sm text-slate-400">Processing...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <UploadIcon size={28} className="text-slate-500" />
                <p className="text-sm font-medium text-slate-300">Drop Excel file here</p>
                <p className="text-xs text-slate-500">or click to browse</p>
                <p className="text-xs text-slate-600 mt-1">
                  Required columns: date, amount<br/>
                  Optional: type, description, category
                </p>
              </div>
            )}
          </div>

          {excelMutation.isError && (
            <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{(excelMutation.error as any)?.response?.data || 'Upload failed'}</span>
            </div>
          )}

          {excelResult && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-400 font-medium mb-3">
                <CheckCircle size={16} />
                Imported {excelResult.imported} transactions
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {excelResult.data?.slice(0, 10).map((tx: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs text-slate-300">
                    <span className="truncate max-w-[140px]">{tx.description || '—'}</span>
                    <div className="flex items-center gap-2">
                      <CategoryBadge category={tx.category} />
                      <span className={tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}>
                        {fmt(tx.amount)}
                      </span>
                    </div>
                  </div>
                ))}
                {excelResult.imported > 10 && (
                  <p className="text-xs text-slate-500 text-center pt-1">
                    +{excelResult.imported - 10} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Receipt OCR */}
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg">
              <Camera size={20} className="text-violet-400" />
            </div>
            <div>
              <h2 className="font-semibold">Receipt Scan (OCR)</h2>
              <p className="text-xs text-slate-400">Upload a photo of a receipt</p>
            </div>
          </div>

          <div
            {...getReceiptProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              receiptDrag
                ? 'border-violet-500 bg-violet-500/5'
                : 'border-slate-700 hover:border-slate-600'
            }`}
          >
            <input {...getReceiptInput()} />
            {ocrMutation.isPending ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={28} className="animate-spin text-violet-400" />
                <p className="text-sm text-slate-400">Extracting text...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Camera size={28} className="text-slate-500" />
                <p className="text-sm font-medium text-slate-300">Drop receipt image here</p>
                <p className="text-xs text-slate-500">JPG, PNG or WebP</p>
              </div>
            )}
          </div>

          {ocrResult && !ocrConfirmed && (
            <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg space-y-3">
              <p className="text-xs font-medium text-slate-300">Extracted data:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-500">Amount</p>
                  <p className="text-slate-200 font-medium">{ocrResult.draft_transaction?.amount ?? 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Date</p>
                  <p className="text-slate-200 font-medium">{ocrResult.draft_transaction?.date ?? 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500">Description</p>
                  <p className="text-slate-200 font-medium truncate">{ocrResult.draft_transaction?.description ?? 'N/A'}</p>
                </div>
              </div>
              {ocrResult.raw_text && (
                <details className="text-xs">
                  <summary className="text-slate-500 cursor-pointer">Raw OCR text</summary>
                  <pre className="mt-1 text-slate-600 text-xs whitespace-pre-wrap max-h-24 overflow-y-auto">
                    {ocrResult.raw_text}
                  </pre>
                </details>
              )}
              <button
                onClick={confirmOcr}
                disabled={createMutation.isPending || !ocrResult.draft_transaction?.amount}
                className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                <Plus size={14} /> Add Transaction
              </button>
            </div>
          )}

          {ocrConfirmed && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
              <CheckCircle size={16} />
              Transaction added successfully!
            </div>
          )}
        </div>
      </div>

      {/* Excel format guide */}
      <div className="card">
        <h3 className="font-medium text-sm mb-3">Excel File Format Guide</h3>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800">
                <th className="text-left py-2 pr-6">Column</th>
                <th className="text-left py-2 pr-6">Required</th>
                <th className="text-left py-2 pr-6">Format / Examples</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {[
                ['date', 'Yes', '2024-01-15, 15.01.2024, 01/15/2024'],
                ['amount', 'Yes', '1500.00, 1500, -500 (negative = expense)'],
                ['type', 'No', 'income or expense (inferred from amount if absent)'],
                ['description', 'No', 'Office rent, Coffee, Google Ads'],
                ['category', 'No', 'Auto-classified by AI if empty'],
              ].map(([col, req, ex]) => (
                <tr key={col}>
                  <td className="py-2 pr-6 font-mono text-violet-400">{col}</td>
                  <td className="py-2 pr-6">{req}</td>
                  <td className="py-2 text-slate-400">{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
