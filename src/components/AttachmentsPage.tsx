import React from 'react';
import {
  X, Image as ImageIcon, Mic, Video as VideoIcon, FileText,
  Trash2, Eye, Download, Play, Music, Sparkles, Folder, Layers
} from 'lucide-react';
import { DiaryEntry, AppLanguage, FileAttachment, AudioRecording } from '../types';
import { getTranslation, getLanguageInfo } from '../lib/languages';
import { getAttachmentObjectUrl, getAttachmentBlob } from '../lib/attachmentStore';

interface AttachmentsPageProps {
  isOpen: boolean;
  onClose: () => void;
  diary: DiaryEntry | null;
  appLanguage: AppLanguage;
  onPreviewMedia: (media: { type: 'image' | 'video' | 'audio' | 'pdf'; url: string; name?: string }) => void;
  onOpenDrawing?: (drawingIndex?: number) => void;
  onDeleteImage?: (index: number) => void;
  onDeleteVideo?: (index: number) => void;
  onDeleteAudio?: (id: string) => void;
  onDeleteFile?: (id: string) => void;
  onDeleteDrawing?: (drawingIndex?: number) => void;
}

export default function AttachmentsPage({
  isOpen,
  onClose,
  diary,
  appLanguage = 'ar',
  onPreviewMedia,
  onOpenDrawing,
  onDeleteImage,
  onDeleteVideo,
  onDeleteAudio,
  onDeleteFile,
  onDeleteDrawing
}: AttachmentsPageProps) {
  const t = getTranslation(appLanguage);
  const langInfo = getLanguageInfo(appLanguage);
  const isAr = appLanguage === 'ar';

  if (!isOpen || !diary) return null;

  const handleOpenFile = async (file: FileAttachment) => {
    let url = (file.dataUrl && file.dataUrl !== '#' && !file.dataUrl.startsWith('blob:null')) ? file.dataUrl : '';
    if ((!url || url === '#') && file.attachmentId) {
      const freshUrl = await getAttachmentObjectUrl(file.attachmentId);
      if (freshUrl) {
        url = freshUrl;
      }
    }
    if (!url || url === '#') return;

    const name = (file.name || '').toLowerCase();
    const type = (file.type || '').toLowerCase();

    if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) {
      onPreviewMedia({ type: 'image', url, name: file.name });
    } else if (type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/i.test(name)) {
      onPreviewMedia({ type: 'video', url, name: file.name });
    } else if (type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(name)) {
      onPreviewMedia({ type: 'audio', url, name: file.name });
    } else if (type.includes('pdf') || name.endsWith('.pdf')) {
      let pdfBlobUrl = url;
      if (file.attachmentId) {
        const rawBlob = await getAttachmentBlob(file.attachmentId);
        if (rawBlob && rawBlob.size > 0) {
          const validPdfBlob = rawBlob.type === 'application/pdf'
            ? rawBlob
            : new Blob([rawBlob], { type: 'application/pdf' });
          pdfBlobUrl = URL.createObjectURL(validPdfBlob);
        }
      }
      onPreviewMedia({ type: 'pdf', url: pdfBlobUrl, name: file.name || 'document.pdf' });
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePlayAudio = async (rec: AudioRecording) => {
    let url = (rec.dataUrl && rec.dataUrl !== '#' && !rec.dataUrl.startsWith('blob:null')) ? rec.dataUrl : '';
    if ((!url || url === '#') && rec.attachmentId) {
      const freshUrl = await getAttachmentObjectUrl(rec.attachmentId);
      if (freshUrl) {
        url = freshUrl;
      }
    }
    if (url && url !== '#') {
      onPreviewMedia({ type: 'audio', url });
    }
  };

  const handleOpenImage = async (imgUrl: string, index: number) => {
    let url = (imgUrl && imgUrl !== '#' && !imgUrl.startsWith('blob:null')) ? imgUrl : '';
    const attId = (diary.imageAttachmentIds || [])[index];
    if ((!url || url === '#') && attId) {
      const freshUrl = await getAttachmentObjectUrl(attId);
      if (freshUrl) {
        url = freshUrl;
      }
    }
    if (url && url !== '#') {
      onPreviewMedia({ type: 'image', url, name: isAr ? 'صورة مرفقة' : 'Image' });
    }
  };

  const handleOpenVideo = async (vidUrl: string, index: number) => {
    let url = (vidUrl && vidUrl !== '#' && !vidUrl.startsWith('blob:null')) ? vidUrl : '';
    const attId = (diary.videoAttachmentIds || [])[index];
    if ((!url || url === '#') && attId) {
      const freshUrl = await getAttachmentObjectUrl(attId);
      if (freshUrl) {
        url = freshUrl;
      }
    }
    if (url && url !== '#') {
      onPreviewMedia({ type: 'video', url, name: isAr ? 'فيديو مرفق' : 'Video' });
    }
  };

  const imagesCount = (diary.images || []).length;
  const videosCount = (diary.videos || []).length;
  const audioCount = (diary.audioRecordings || []).length;
  const filesCount = (diary.files || []).length;
  const drawings: string[] = (Array.isArray(diary.drawings) && diary.drawings.length > 0)
    ? diary.drawings
    : (diary.drawing ? [diary.drawing] : []);
  const drawingsCount = drawings.length;
  const totalCount = imagesCount + videosCount + audioCount + filesCount + drawingsCount;

  return (
    <div className="fixed inset-0 z-[115] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn" dir={langInfo.dir}>
      <div className="bg-white border border-[#E2DCC8] rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2DCC8]/70 flex items-center justify-between bg-[#F9F7F2]">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="p-2.5 bg-[#8B9D83]/15 text-[#8B9D83] rounded-2xl text-lg">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-[#3A3A3A] flex items-center gap-2">
                <span>{t.attachmentsPageTitle || (isAr ? 'الملحقات والوسائط' : 'Attachments & Media')}</span>
                <span className="text-xs bg-[#8B9D83] text-white px-2.5 py-0.5 rounded-full font-bold">
                  {totalCount}
                </span>
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                {diary.title ? `"${diary.title}"` : (isAr ? 'مرفقات التدوينة الحالية' : 'Current diary attachments')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-500 border border-[#E2DCC8] flex items-center justify-center transition-all cursor-pointer shadow-3xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
              <ImageIcon className="w-4 h-4 text-amber-700" />
              <span className="text-[10px] text-amber-900 font-bold">{t.imagesCount || (isAr ? 'الصور' : 'Images')}</span>
              <span className="text-sm font-black text-amber-950">{imagesCount}</span>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
              <Mic className="w-4 h-4 text-emerald-700" />
              <span className="text-[10px] text-emerald-900 font-bold">{t.audioCount || (isAr ? 'التسجيلات' : 'Audio')}</span>
              <span className="text-sm font-black text-emerald-950">{audioCount}</span>
            </div>

            <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
              <VideoIcon className="w-4 h-4 text-purple-700" />
              <span className="text-[10px] text-purple-900 font-bold">{t.videosCount || (isAr ? 'الفيديوهات' : 'Videos')}</span>
              <span className="text-sm font-black text-purple-950">{videosCount}</span>
            </div>

            <div className="p-3 bg-red-50/70 border border-red-200/80 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
              <FileText className="w-4 h-4 text-red-700" />
              <span className="text-[10px] text-red-900 font-bold">{t.pdfCount || (isAr ? 'الملفات و PDF' : 'Files & PDF')}</span>
              <span className="text-sm font-black text-red-950">{filesCount}</span>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex flex-col items-center justify-center text-center space-y-1 col-span-2 sm:col-span-1">
              <Layers className="w-4 h-4 text-blue-700" />
              <span className="text-[10px] text-blue-900 font-bold">{isAr ? 'الرسومات الذهنية' : 'Drawings'}</span>
              <span className="text-sm font-black text-blue-950">{drawingsCount}</span>
            </div>
          </div>

          {totalCount === 0 ? (
            <div className="text-center py-12 px-4 bg-[#F9F7F2] rounded-3xl border border-dashed border-[#E2DCC8] space-y-2">
              <Folder className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-xs font-bold text-gray-500">{t.noAttachments || (isAr ? 'لا توجد ملحقات لهذه التدوينة بعد.' : 'No attachments for this diary yet.')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 1. Images Gallery */}
              {imagesCount > 0 && (
                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs text-[#5A5A40] flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                    <span>{t.attachedImagesDrawings || (isAr ? 'الصور المرفقة' : 'Attached Images')}</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {diary.images.map((img, idx) => (
                      <div key={idx} className="relative group rounded-2xl overflow-hidden border border-[#E2DCC8] shadow-3xs aspect-square bg-gray-50">
                        <img
                          src={img}
                          alt="Attachment"
                          className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform"
                          onClick={() => handleOpenImage(img, idx)}
                          onError={async (e) => {
                            const attId = (diary.imageAttachmentIds || [])[idx];
                            if (attId) {
                              const fresh = await getAttachmentObjectUrl(attId);
                              if (fresh) {
                                (e.target as HTMLImageElement).src = fresh;
                              }
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenImage(img, idx);
                            }}
                            className="p-1.5 bg-white/90 hover:bg-white text-gray-800 rounded-xl transition-all shadow-sm cursor-pointer"
                            title={isAr ? 'عرض' : 'View'}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {onDeleteImage && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteImage(idx);
                              }}
                              className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-sm cursor-pointer"
                              title={isAr ? 'حذف' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Audio Recordings */}
              {audioCount > 0 && (
                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs text-[#5A5A40] flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t.audioRecording || (isAr ? 'التسجيلات الصوتية والتفريغ' : 'Audio Recordings & Transcripts')}</span>
                  </h4>
                  <div className="space-y-2.5">
                    {diary.audioRecordings.map((rec) => (
                      <div key={rec.id} className="p-3.5 bg-[#F9F7F2] border border-[#E2DCC8] rounded-2xl space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                              <Music className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold block text-[#3A3A3A]">{rec.name}</span>
                              <span className="text-[10px] text-gray-500 font-medium">{t.durationLabel || 'المدة'}: {rec.duration}s</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handlePlayAudio(rec)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10.5px] transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Play className="w-3 h-3" />
                              <span>{isAr ? 'تشغيل' : 'Play'}</span>
                            </button>
                            {onDeleteAudio && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteAudio(rec.id);
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title={isAr ? 'حذف' : 'Delete'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {rec.transcription && !rec.transcription.includes('انقر على زر') && (
                          <div className="p-2.5 bg-white rounded-xl border border-gray-100 text-[11px] leading-relaxed text-[#3A3A3A] whitespace-pre-wrap">
                            <strong className="text-emerald-800 block mb-1">🎙️ {isAr ? 'التفريغ النصي:' : 'Transcript:'}</strong>
                            {rec.transcription}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Videos */}
              {videosCount > 0 && (
                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs text-[#5A5A40] flex items-center gap-1.5">
                    <VideoIcon className="w-3.5 h-3.5 text-purple-600" />
                    <span>{t.attachedVideos || (isAr ? 'الفيديوهات المرفقة' : 'Attached Videos')}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {diary.videos.map((vid, idx) => (
                      <div key={idx} className="p-3 bg-[#F9F7F2] border border-[#E2DCC8] rounded-2xl space-y-2">
                        {vid.startsWith('data:video/') || vid.startsWith('blob:') || vid.includes('mp4') ? (
                          <video
                            src={vid}
                            controls
                            className="w-full h-36 rounded-xl bg-black object-cover cursor-pointer"
                            onClick={() => handleOpenVideo(vid, idx)}
                            onError={async (e) => {
                              const attId = (diary.videoAttachmentIds || [])[idx];
                              if (attId) {
                                const fresh = await getAttachmentObjectUrl(attId);
                                if (fresh) {
                                  (e.target as HTMLVideoElement).src = fresh;
                                }
                              }
                            }}
                          />
                        ) : (
                          <div className="p-3 bg-white rounded-xl border border-[#E2DCC8]/60 text-xs truncate">
                            <a href={vid} target="_blank" rel="noopener noreferrer" className="text-[#8B9D83] underline truncate block">
                              {vid}
                            </a>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => handleOpenVideo(vid, idx)}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[10.5px] cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{isAr ? 'معاينة في مشغل كبير' : 'Open in Player'}</span>
                          </button>
                          {onDeleteVideo && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteVideo(idx);
                              }}
                              className="text-xs text-red-600 hover:text-red-700 font-bold cursor-pointer"
                            >
                              {isAr ? 'حذف' : 'Delete'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Files & PDF Documents */}
              {filesCount > 0 && (
                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs text-[#5A5A40] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-red-600" />
                    <span>{t.pdfCount || (isAr ? 'المستندات والملفات' : 'Documents & Files')}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {diary.files.map((file) => (
                      <div key={file.id} className="p-3 bg-white border border-[#E2DCC8] rounded-2xl flex items-center justify-between gap-2 shadow-3xs">
                        <div className="flex items-center space-x-2 space-x-reverse min-w-0">
                          <div className="p-2 bg-red-50 text-red-700 rounded-xl shrink-0 font-black text-xs">
                            📄
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-[#3A3A3A] truncate block">{file.name}</span>
                            <span className="text-[10px] text-gray-500 block">{file.size}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenFile(file)}
                            className="p-1.5 bg-[#8B9D83] hover:bg-[#72856A] text-white rounded-lg transition-colors cursor-pointer"
                            title={isAr ? 'معاينة / فتح' : 'Open'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {file.dataUrl && file.dataUrl !== '#' && (
                            <a
                              href={file.dataUrl}
                              download={file.name}
                              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
                              title={isAr ? 'تحميل' : 'Download'}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {onDeleteFile && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteFile(file.id);
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title={isAr ? 'حذف' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Mind Map Drawings (Multi-Drawings Support) */}
              {drawingsCount > 0 && (
                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs text-[#5A5A40] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>{t.canvasDrawing || (isAr ? 'الرسم والتخطيط الذهني' : 'Mind Map & Drawings')} ({drawingsCount})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {drawings.map((drawSrc, dIdx) => (
                      <div key={dIdx} className="p-4 bg-white border border-[#E2DCC8] rounded-2xl space-y-3">
                        <img
                          src={drawSrc}
                          alt={`Mindmap Drawing ${dIdx + 1}`}
                          className="w-full max-h-48 object-contain rounded-xl border border-gray-100 bg-[#F9F7F2] cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => onOpenDrawing?.(dIdx)}
                        />
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => onOpenDrawing?.(dIdx)}
                            className="px-3 py-1.5 bg-[#8B9D83] hover:bg-[#72856A] text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-3xs"
                          >
                            {isAr ? 'فتح وتعديل الرسمة' : 'Open & Edit Drawing'}
                          </button>
                          {onDeleteDrawing && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteDrawing(dIdx);
                              }}
                              className="text-xs text-red-600 hover:text-red-700 font-bold cursor-pointer"
                            >
                              {isAr ? 'حذف' : 'Delete'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
