# 本地照片识别

角色照片识别使用开源的 MediaPipe Tasks Vision `@mediapipe/tasks-vision@0.10.32`（Apache-2.0）。人脸检测模型采用 Google 官方示例中的 BlazeFace Short Range，来源：

https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite

运行文件和模型放在 `client/public/vision/`，仅在用户上传照片时按需加载。网站不需要模型服务 API 或密钥；浏览器分析照片后，仅把人脸框、色板、发色与服装色等派生特征传给既有角色生成逻辑。原始照片不发送到后端。模型未加载或未检测到人脸时回退到整图色彩分析。

此模型只定位人脸，不是图像生成模型，也不能准确判断真实发型、人格、年龄或身份。脸框宽高比仅用作风格化轮廓提示；MBTI 与人物故事仍来自用户自己填写的内容。
