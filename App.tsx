
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat, Part } from '@google/genai';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import saveAs from 'file-saver';
import { Message } from './types';
import { SYSTEM_INSTRUCTION } from './constants';
import { RobotIcon, SendIcon, Spinner, UploadIcon, FileTextIcon, PaperclipIcon, DownloadIcon, CameraIcon, XCircleIcon, PlusCircleIcon, InfoIcon } from './components/icons';

const API_KEY = process.env.API_KEY;

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;


const SimpleMarkdownRenderer = ({ text }: { text: string }) => {
  const processLine = (line: string) => {
    const escapeHtml = (unsafe: string) =>
      unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    line = escapeHtml(line).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return line;
  };
    
  return (
    <div>
      {text.split('\n').map((line, index) => {
        if (line.trim().startsWith('###')) {
          return <h3 key={index} className="text-lg font-semibold mt-4 mb-2" dangerouslySetInnerHTML={{__html: processLine(line.replace(/###\s?/, ''))}} />
        }
        if (line.trim().startsWith('##')) {
          return <h2 key={index} className="text-xl font-bold mt-6 mb-3" dangerouslySetInnerHTML={{__html: processLine(line.replace(/##\s?/, ''))}} />
        }
        if (line.trim().startsWith('#')) {
          return <h1 key={index} className="text-2xl font-bold mt-8 mb-4" dangerouslySetInnerHTML={{__html: processLine(line.replace(/#\s?/, ''))}} />
        }
        if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
            return <li key={index} className="ml-6 list-disc" dangerouslySetInnerHTML={{__html: processLine(line.substring(2))}} />;
        }
        if (line.trim() === '') {
            return <div key={index} className="h-4" />;
        }
        return <p key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: processLine(line) }} />;
      })}
    </div>
  );
};

const AboutModal = ({ onClose }: { onClose: () => void }) => {
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold">Giới thiệu & Hướng dẫn sử dụng</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <XCircleIcon className="w-7 h-7" />
                    </button>
                </header>
                <div className="p-6 overflow-y-auto space-y-6 text-slate-700 dark:text-slate-300">
                    <div>
                        <h3 className="text-md font-semibold text-slate-800 dark:text-slate-100 mb-2">AI Phân tích tài liệu là gì?</h3>
                        <p>Đây là một công cụ được thiết kế như một trợ lý ảo thông minh, hỗ trợ chuyên sâu trong việc nghiên cứu, phân tích và khai thác giá trị từ các văn bản, tài liệu chuyên môn. Ứng dụng tận dụng sức mạnh của trí tuệ nhân tạo (AI) không chỉ giúp bạn nhanh chóng tóm tắt nội dung, nhận diện các ý chính, xu hướng và mối liên hệ quan trọng, mà còn gợi ý hướng áp dụng sáng tạo vào thực tế công việc, phù hợp với đặc thù ngành nghề, lĩnh vực và nhiệm vụ cụ thể của từng người.</p>
                    </div>
                    <div>
                        <h3 className="text-md font-semibold text-slate-800 dark:text-slate-100 mb-2">Các chức năng chính</h3>
                        <ul className="space-y-4">
                            <li><strong>Tải tệp lên:</strong> Cho phép bạn tải lên các tài liệu có sẵn từ máy tính.
                                <ul className="list-disc pl-5 mt-1 text-sm text-slate-600 dark:text-slate-400">
                                    <li><strong>Ví dụ:</strong> Tải lên một Nghị quyết dạng .pdf, một Kế hoạch dạng .docx, hoặc một ảnh chụp công văn dạng .png.</li>
                                    <li>AI sẽ tự động đọc và trích xuất nội dung văn bản để phân tích.</li>
                                </ul>
                            </li>
                            <li><strong>Dán văn bản:</strong> Cho phép bạn sao chép nội dung từ bất kỳ đâu và dán trực tiếp vào ứng dụng.
                                <ul className="list-disc pl-5 mt-1 text-sm text-slate-600 dark:text-slate-400">
                                    <li><strong>Ví dụ:</strong> Sao chép nội dung một bài báo chính sách trên mạng và dán vào ô văn bản.</li>
                                </ul>
                            </li>
                            <li><strong>Chụp ảnh:</strong> Sử dụng camera của điện thoại hoặc máy tính để chụp ảnh tài liệu giấy.
                                <ul className="list-disc pl-5 mt-1 text-sm text-slate-600 dark:text-slate-400">
                                    <li><strong>Ví dụ:</strong> Chụp ảnh một chỉ thị vừa được ban hành trên giấy.</li>
                                    <li>AI sẽ thực hiện nhận dạng ký tự quang học (OCR) để chuyển hình ảnh thành văn bản và phân tích.</li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-md font-semibold text-slate-800 dark:text-slate-100 mb-2">Tương tác và các tính năng khác</h3>
                         <ul className="space-y-4">
                            <li><strong>Đặt câu hỏi:</strong> Sau khi có bản phân tích đầu tiên, bạn có thể tiếp tục trò chuyện với AI bằng cách nhập câu hỏi vào ô chat để làm rõ nội dung hoặc yêu cầu hỗ trợ thêm.</li>
                            <li><strong>Tải xuống DOCX:</strong> Dưới mỗi câu trả lời của AI, có một nút cho phép bạn tải xuống toàn bộ nội dung phân tích dưới dạng tệp Microsoft Word (.docx) đã được định dạng sẵn.</li>
                            <li><strong>Nhiệm vụ mới:</strong> Nút này ở góc trên bên phải cho phép bạn xóa toàn bộ phiên làm việc hiện tại và quay lại màn hình chính để bắt đầu một phân tích mới.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};


type InputMode = 'paste' | 'upload' | 'camera';

const App: React.FC = () => {
  const [apiKeyError, setApiKeyError] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isInitialView, setIsInitialView] = useState(true);

  // States for initial input
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [documentText, setDocumentText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessingInput, setIsProcessingInput] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const initializeChat = useCallback(() => {
    if (!API_KEY) {
      setApiKeyError(true);
      return;
    }
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });
    setChatSession(chat);
  }, []);

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isAiLoading]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    let videoElement = videoRef.current;
    if (isCameraOpen && videoElement) {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
            }
        } catch (err) {
          console.error("Lỗi mở camera:", err);
          setProcessingError("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập trong trình duyệt của bạn.");
          setIsCameraOpen(false);
        }
      };
      startCamera();
    } else {
        stopCamera();
    }
    
    return () => {
        stopCamera();
    };
}, [isCameraOpen, stopCamera]);
  
  const handleSendMessage = useCallback(async (contents: { parts: Part[] }, userTextForDisplay: string) => {
    if (isAiLoading || !chatSession) return;

    setIsAiLoading(true);
    const newMessages: Message[] = [...messages, { role: 'user', text: userTextForDisplay }];
    setMessages(newMessages);
    setUserInput('');
    if (isInitialView) setIsInitialView(false);
    
    try {
        const stream = await chatSession.sendMessageStream({ message: contents.parts });
        let modelResponse = '';
        setMessages(prev => [...prev, { role: 'model', text: '' }]);

        for await (const chunk of stream) {
            modelResponse += chunk.text;
            setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                if(lastMessage.role === 'model') {
                    lastMessage.text = modelResponse;
                    return [...prev.slice(0, -1), lastMessage];
                }
                return prev;
            });
        }
    } catch (error) {
        console.error('Lỗi khi gửi tin nhắn:', error);
        const errorText = 'Rất tiếc, đã có lỗi xảy ra khi giao tiếp với AI. Vui lòng thử lại sau.';
        setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if(lastMessage.role === 'model') {
                lastMessage.text = errorText;
                return [...prev.slice(0, -1), lastMessage];
            }
            return [...prev, {role: 'model', text: errorText}];
        });
    } finally {
        setIsAiLoading(false);
    }
}, [isAiLoading, chatSession, messages, isInitialView]);

  const handleUserFollowUp = async (text: string) => {
      if (!text.trim()) return;
      await handleSendMessage({ parts: [{ text }] }, text);
  };
  
  const extractText = async (): Promise<string> => {
    if (inputMode === 'paste') {
        return documentText;
    }

    if (inputMode === 'upload' && selectedFile) {
        setLoadingMessage('Đang xử lý tệp...');
        if (selectedFile.type === 'application/pdf') {
            const fileReader = new FileReader();
            return new Promise((resolve, reject) => {
                fileReader.onload = async (event) => {
                    try {
                        const typedarray = new Uint8Array(event.target.result as ArrayBuffer);
                        const pdf = await pdfjsLib.getDocument(typedarray).promise;
                        let text = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent();
                            text += content.items.map(item => 'str' in item ? item.str : '').join(' ') + '\n';
                        }
                        resolve(text);
                    } catch (e) {
                        reject(new Error('Không thể đọc tệp PDF. Tệp có thể bị lỗi hoặc được bảo vệ bằng mật khẩu.'));
                    }
                };
                fileReader.onerror = () => reject(new Error('Lỗi khi đọc tệp.'));
                fileReader.readAsArrayBuffer(selectedFile);
            });
        } else if (selectedFile.name.endsWith('.docx')) {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value;
        } else {
            throw new Error('Định dạng tệp không được hỗ trợ.');
        }
    }

    return '';
  };

  const handleInitialAnalysis = async () => {
    setIsProcessingInput(true);
    setProcessingError(null);
    setLoadingMessage('Đang chuẩn bị phân tích...');

    try {
        let contents: { parts: Part[] };
        let userTextForDisplay: string;

        if (inputMode === 'upload' && selectedFile && selectedFile.type.startsWith('image/')) {
            setLoadingMessage('Đang xử lý ảnh...');
            const base64Image = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (error) => reject(new Error('Lỗi khi đọc tệp ảnh.'));
                reader.readAsDataURL(selectedFile);
            });

            const imagePart = {
                inlineData: {
                    mimeType: selectedFile.type,
                    data: base64Image.split(',')[1],
                },
            };
            const textPart = { text: "Trích xuất văn bản từ hình ảnh này và sau đó phân tích nội dung đó theo hướng dẫn hệ thống." };
            contents = { parts: [imagePart, textPart] };
            userTextForDisplay = `[Đã tải lên tệp ảnh: ${selectedFile.name}]`;
        
        } else if (inputMode === 'camera' && capturedImage) {
            setLoadingMessage('Đang nhận dạng ảnh...');
            const imagePart = {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: capturedImage.split(',')[1],
                },
            };
            const textPart = { text: "Trích xuất văn bản từ hình ảnh này và sau đó phân tích nội dung đó theo hướng dẫn hệ thống." };
            contents = { parts: [imagePart, textPart] };
            userTextForDisplay = '[Đã gửi một ảnh để phân tích]';
        } else {
            const textToAnalyze = await extractText();
            if (!textToAnalyze.trim()) {
                setProcessingError("Không có nội dung để phân tích.");
                setIsProcessingInput(false);
                return;
            }
            const prompt = `Phân tích văn bản sau đây:\n\n---\n\n${textToAnalyze}`;
            contents = { parts: [{ text: prompt }] };
            userTextForDisplay = 'Phân tích tài liệu đã cung cấp.';
        }
        
        await handleSendMessage(contents, userTextForDisplay);
        setDocumentText('');
        setSelectedFile(null);
        setCapturedImage(null);

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
        setProcessingError(message);
    } finally {
        setIsProcessingInput(false);
        setLoadingMessage('');
    }
  };

  const handleOpenCamera = () => {
    setProcessingError(null);
    setIsCameraOpen(true);
  };

  const handleTakePhoto = () => {
    const video = videoRef.current;
    if (video) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL('image/jpeg'));
        setIsCameraOpen(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProcessingError(null);
    const file = e.target.files?.[0];
    if (file) {
        if (file.type === 'application/pdf' || file.name.endsWith('.docx') || file.type.startsWith('image/')) {
            setSelectedFile(file);
        } else {
            setProcessingError('Định dạng tệp không hợp lệ. Vui lòng chọn tệp .docx, .pdf hoặc tệp ảnh.');
            setSelectedFile(null);
        }
    }
  };

  const handleDownloadDocx = async (text: string) => {
    if (!text) return;

    const parseLineToRuns = (line: string): TextRun[] => {
      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g).filter(part => part);
      return parts.map(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return new TextRun({ text: part.slice(2, -2), bold: true });
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return new TextRun({ text: part.slice(1, -1), italics: true });
        }
        return new TextRun(part);
      });
    };

    const paragraphs: Paragraph[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine === '') {
          paragraphs.push(new Paragraph({ children: [new TextRun('')] }));
          continue;
      }

      let contentLine = line;
      let paragraphOptions: any = {};

      if (trimmedLine.startsWith('### ')) {
        paragraphOptions.heading = HeadingLevel.HEADING_3;
        contentLine = line.replace(/^###\s*/, '');
      } else if (trimmedLine.startsWith('## ')) {
        paragraphOptions.heading = HeadingLevel.HEADING_2;
        contentLine = line.replace(/^##\s*/, '');
      } else if (trimmedLine.startsWith('# ')) {
        paragraphOptions.heading = HeadingLevel.HEADING_1;
        contentLine = line.replace(/^#\s*/, '');
      } else if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
        paragraphOptions.bullet = { level: 0 };
        contentLine = line.replace(/^(\*|-)\s*/, '');
      }

      paragraphOptions.children = parseLineToRuns(contentLine);
      paragraphs.push(new Paragraph(paragraphOptions));
    }

    const doc = new Document({
      sections: [{
        children: paragraphs,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "AIPhanTichTaiLieu.docx");
  };
    
  const handleNewTask = useCallback(() => {
    setIsInitialView(true);
    setMessages([]);
    setUserInput('');
    setIsAiLoading(false);
    setDocumentText('');
    setSelectedFile(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
    setCapturedImage(null);
    setProcessingError(null);
    setLoadingMessage('');
    setInputMode('upload');
    initializeChat();
  }, [initializeChat]);


  const isInputValid =
    (inputMode === 'paste' && documentText.trim() !== '') ||
    (inputMode === 'upload' && selectedFile !== null) ||
    (inputMode === 'camera' && capturedImage !== null);

  const renderInitialView = () => {
    const TabButton = ({ mode, icon, label }: { mode: InputMode, icon: React.ReactNode, label: string }) => (
        <button
          role="tab"
          aria-selected={inputMode === mode}
          onClick={() => { setInputMode(mode); setProcessingError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-semibold border-b-2 transition-colors duration-200 ${
            inputMode === mode 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          {icon}
          {label}
        </button>
    );

    return (
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center h-full">
        <div className="text-center mb-6">
          <RobotIcon className="h-16 w-16 mx-auto text-blue-500 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Xin chào!</h2>
          <p className="text-slate-600 dark:text-slate-400 px-4">Tôi là trợ lý AI phân tích văn bản và tài liệu chuyên môn. Vui lòng cung cấp tài liệu cần phân tích.</p>
        </div>
        <div className="w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-2 sm:p-4">
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <TabButton mode="upload" icon={<UploadIcon className="w-5 h-5" />} label="Tải tệp lên" />
            <TabButton mode="paste" icon={<FileTextIcon className="w-5 h-5" />} label="Dán văn bản" />
            <TabButton mode="camera" icon={<CameraIcon className="w-5 h-5" />} label="Chụp ảnh" />
          </div>
          <div className="pt-4 px-2 sm:px-4">
            {processingError && <div className="mb-4 p-3 text-sm bg-red-100 text-red-700 rounded-lg">{processingError}</div>}
            {inputMode === 'paste' && (
               <textarea
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                placeholder="Dán nội dung văn bản cần phân tích vào đây..."
                className="w-full h-48 p-4 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-slate-800"
                aria-label="Nội dung văn bản"
              />
            )}
            {inputMode === 'upload' && (
              <div
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
                onClick={() => fileInputRef.current?.click()}
                onDrop={(e) => { e.preventDefault(); handleFileChange({ target: e.dataTransfer } as any); }}
                onDragOver={(e) => e.preventDefault()}
              >
                <input ref={fileInputRef} type="file" onChange={handleFileChange} accept=".pdf,.docx,image/*" className="hidden" aria-label="Tải tệp lên"/>
                {selectedFile ? (
                  <div className="text-center">
                    <PaperclipIcon className="w-8 h-8 mx-auto text-green-500 mb-2"/>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{Math.round(selectedFile.size / 1024)} KB</p>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="mt-2 text-xs text-red-500 hover:underline">Xóa tệp</button>
                  </div>
                ) : (
                   <div className="text-center text-slate-500">
                     <UploadIcon className="w-10 h-10 mx-auto mb-2" />
                     <p className="font-semibold">Kéo và thả hoặc bấm để chọn tệp</p>
                     <p className="text-sm">Hỗ trợ: .docx, .pdf, Ảnh</p>
                   </div>
                )}
              </div>
            )}
             {inputMode === 'camera' && (
                <div className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
                    {capturedImage ? (
                        <div className="relative w-full h-full">
                            <img src={capturedImage} alt="Ảnh đã chụp" className="w-full h-full object-contain rounded-lg" />
                            <button 
                                onClick={() => setCapturedImage(null)}
                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/75"
                                title="Chụp lại"
                            >
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleOpenCamera} className="flex flex-col items-center justify-center text-slate-500 hover:text-blue-500">
                            <CameraIcon className="w-10 h-10 mx-auto mb-2" />
                            <p className="font-semibold">Mở Camera để chụp ảnh</p>
                            <p className="text-sm">Chụp ảnh văn bản giấy</p>
                        </button>
                    )}
                </div>
             )}
          </div>
           <div className="p-4">
            <button
              onClick={handleInitialAnalysis}
              disabled={!isInputValid || isProcessingInput || isAiLoading}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
            >
              {(isProcessingInput || isAiLoading) ? <Spinner className="mr-2" /> : <RobotIcon className="mr-2 h-5 w-5"/>}
              {isProcessingInput ? loadingMessage : (isAiLoading ? 'Đang phân tích...' : 'Bắt đầu Phân tích')}
            </button>
           </div>
        </div>
      </div>
    );
  }

  const renderCameraView = () => (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
        <button onClick={() => setIsCameraOpen(false)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-3">
            <XCircleIcon className="w-8 h-8" />
        </button>
        <div className="absolute bottom-8">
            <button onClick={handleTakePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-white/50 ring-4 ring-black/30"></button>
        </div>
    </div>
  );
  
  if (apiKeyError) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-100 text-red-800">
        <div className="text-center p-8 bg-white rounded-lg shadow-xl">
          <h1 className="text-2xl font-bold mb-4">Lỗi Cấu hình</h1>
          <p>Không tìm thấy API Key. Vui lòng cấu hình biến môi trường `API_KEY`.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen font-sans text-slate-800 dark:text-slate-200">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm p-4 flex items-center justify-center relative">
        <button
            onClick={() => setIsAboutModalOpen(true)}
            className="absolute left-4 flex items-center justify-center w-10 h-10 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            title="Giới thiệu và Hướng dẫn"
        >
            <InfoIcon className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-center text-slate-900 dark:text-white">
          AI Phân tích tài liệu
        </h1>
        {!isInitialView && (
            <button
                onClick={handleNewTask}
                className="absolute right-4 flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                title="Bắt đầu nhiệm vụ mới"
            >
                <PlusCircleIcon className="w-5 h-5" />
                <span>Nhiệm vụ mới</span>
            </button>
        )}
      </header>
      
      <main className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
        {isInitialView ? renderInitialView() : (
          <div className="flex flex-col flex-1 max-w-4xl mx-auto w-full h-full bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
            <div ref={chatContainerRef} className="flex-1 p-6 space-y-6 overflow-y-auto">
              {messages.map((msg, index) => (
                <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'model' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                      <RobotIcon className="h-5 w-5 text-slate-500" />
                    </div>
                  )}
                  <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-xl p-4 rounded-xl break-words ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'
                    }`}>
                      <div className="prose prose-sm max-w-none text-inherit">
                        <SimpleMarkdownRenderer text={msg.text} />
                      </div>
                    </div>
                    {msg.role === 'model' && msg.text && (!isAiLoading || index < messages.length - 1) && (
                       <div className="mt-2">
                         <button
                           onClick={() => handleDownloadDocx(msg.text)}
                           className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                           title="Tải xuống dưới dạng .DOCX"
                         >
                           <DownloadIcon className="w-4 h-4" />
                           <span>Tải xuống DOCX</span>
                         </button>
                       </div>
                     )}
                  </div>
                </div>
              ))}
              {isAiLoading && messages[messages.length -1]?.role !== 'model' && (
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    <RobotIcon className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="max-w-xl p-4 rounded-xl bg-slate-100 dark:bg-slate-700">
                    <Spinner />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <form onSubmit={(e) => { e.preventDefault(); handleUserFollowUp(userInput); }}>
                <div className="relative">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Đặt câu hỏi hoặc yêu cầu hỗ trợ..."
                    className="w-full py-3 pl-4 pr-12 text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isAiLoading || !userInput.trim()}
                    className="absolute inset-y-0 right-0 flex items-center justify-center w-12 h-full text-blue-500 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed"
                    aria-label="Gửi"
                  >
                    <SendIcon className="w-6 h-6" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
      <footer className="shrink-0 border-t border-slate-200 dark:border-slate-700 p-3 text-center text-sm text-slate-500 dark:text-slate-400">
          Phát triển bởi: <a href="http://trolyai.io.vn/" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">Đỗ Như Lâm</a>
      </footer>
      {isCameraOpen && renderCameraView()}
      {isAboutModalOpen && <AboutModal onClose={() => setIsAboutModalOpen(false)} />}
    </div>
  );
};

export default App;
