import { useState, useRef, useEffect } from "react";
import { Box, Input, Button, Text, ChakraProvider, VStack, Heading, Alert, AlertIcon, Spinner, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton } from "@chakra-ui/react";

const App = () => {
  const [groupname, setGroupname] = useState("");
  const [message, setMessage] = useState("");
  const [playerCount, setPlayerCount] = useState(1);
  const [difficulty, setDifficulty] = useState(1);
  const [roomId, setRoomId] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isScanning, setIsScanning] = useState(true); // Start scanning on load
  const [isComplete, setIsComplete] = useState(false); // To show completion button
  const [queueNumber, setQueueNumber] = useState(""); // Barcode input field
  const [qrData, setQrData] = useState("");
  const [isBarcodeInput, setIsBarcodeInput] = useState(false); // Track if barcode input is expected
  const qrInputRef = useRef(null);
  const barcodeInputRef = useRef(null); // Ref for barcode input
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Focus the QR input on mount
  useEffect(() => {
    setTimeout(() => {
      if (qrInputRef.current) {
        qrInputRef.current.focus();
      }
    }, 10);
  }, []);

  // Handle retry for duplicate check
  const handleRetry = async () => {
    if (qrData.endsWith("}")) {
      handleQRInput(qrData, true);
    }
    onClose(); // Close modal
  };

  // Centralized QR code handling logic
  const handleQRInput = async (input, dupCheck = false) => {
    try {
      const qrJson = JSON.parse(input);
      setGroupname(qrJson.groupName || "");
      setPlayerCount(qrJson.members || 1);
      setDifficulty(qrJson.difficulty || 1);
      setMessage("QRコード読み取り中...");
      setMessageType("info");
      setIsScanning(false); // Stop scanning
      setIsBarcodeInput(true); // Prepare for barcode input
      setQueueNumber("");
      // Focus the barcode input field after QR scan
      setTimeout(() => {
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }, 100);
    } catch (error) {
      console.error("Invalid QR code JSON:", error);
      setMessage("QRコードの内容が正しくありません。");
      setMessageType("error");
      setQrData(""); // Clear QR input field on error
    }
  };

  // Handle form submission after barcode input
  const handleSubmit = async (dupCheck = false) => {
    try {
      const response = await fetch(`http://${window.location.host}/api/adminui/regChallenge/auto`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          GroupName: groupname,
          playerCount: playerCount,
          difficulty: difficulty,
          queueNumber: queueNumber,
          dupCheck: dupCheck, // Use the dupCheck flag
        }),
      });
      const result = await response.json();
      if (result.success) {
        setRoomId(result.roomId); // Get the room ID from the response
        setMessage(result.message);
        setMessageType("success");
        setIsComplete(true);

        // Display the message for 5 seconds, then reload the page
        setTimeout(() => {
          setMessage("");
          setIsComplete(true); // Show completion button
          window.location.reload();
        }, 5000);
      } else {
        if (!result.success && result.message.includes("dupCheck")) {
          setMessage("同じグループ名が存在します。過去にプレイしたことがあるかを確認し、ある場合は「はい」を、そうでなく、新しいグループ名の場合は「いいえ」を選択し、新しくグループ名を入力してください。");
          setMessageType("warning");
          onOpen(); // Open DupCheck modal
          return;
        }
        setMessage(result.message);
        setMessageType("error");
      }
    } catch (error) {
      console.error("Error during submission:", error);
      setMessage("エラーが発生しました。");
      setMessageType("error");
    }
  };

  // Handle the QR code input, parse it and prepare for barcode input
  const handleQRInputChange = async (e) => {
    const input = e.target.value;
    setQrData(input);

    if (input.endsWith("}")) {
      handleQRInput(input); // Reuse the centralized QR input handler
    }
  };

  // Handle the barcode input
  const handleBarcodeInputChange = (e) => {
    const input = e.target.value;
    setQueueNumber(input);

    // Submit the form automatically once 3 digits are entered
    if (input.length === 3) {
      handleSubmit(); // Submit with barcode data
    }
  };

  // Refocus the QR input if it loses focus
  const handleQRInputBlur = () => {
    setTimeout(() => {
      if (qrInputRef.current) {
        qrInputRef.current.focus();
      }
    }, 100); // Refocus after a short delay
  };

  return (
    <ChakraProvider>
      <Box maxW="100vw" maxH="100vh" mx="auto" mt={10} p={6} borderWidth={1} borderRadius="lg" boxShadow="lg" overflow="hidden" width="100%" height="100vh" display="flex" flexDirection="column" justifyContent="center" alignItems="center">
        <Heading as="h1" size="lg" mb={6} textAlign="center">
          QRグループ登録
        </Heading>

        {message && (
          <Alert status={messageType} mb={6}>
            <AlertIcon />
            {message} {roomId && `Room ID: ${roomId}`}
          </Alert>
        )}

        {isScanning ? (
          <Box display="flex" justifyContent="center" alignItems="center" flexDirection="column" width="100vw" height="100vh">
            <Spinner size="xl" />
            {/* Hidden input field for QR code input */}
            <Input
              ref={qrInputRef}
              value={qrData}
              onChange={handleQRInputChange}
              onBlur={handleQRInputBlur} // Add onBlur event handler
              position="absolute"
              top="-9999px"
              aria-hidden="true"
              type="text"
            />
            <Text mt={4} textAlign="center">
              QRコードをスキャンしてください...
            </Text>
          </Box>
        ) : isBarcodeInput ? (
          <Box display="flex" justifyContent="center" alignItems="center" flexDirection="column" width="100vw" height="100vh">
            <Input ref={barcodeInputRef} value={queueNumber} onChange={handleBarcodeInputChange} placeholder="3桁の番号を入力してください" maxLength={3} type="number" />
            <Text mt={4} textAlign="center">
              3桁のバーコードをスキャンしてください...
            </Text>
          </Box>
        ) : (
          <VStack spacing={4} width="100%">
            <Text>グループ名: {groupname}</Text>
            <Text>人数: {playerCount}</Text>
            <Text>難易度: {difficulty}</Text>
            <Text>ルームID: {roomId}</Text>
          </VStack>
        )}

        {isComplete && (
          <Button colorScheme="teal" mt={6} onClick={() => window.location.reload()}>
            完了
          </Button>
        )}

        {/* DupCheck Modal */}
        <Modal
          isOpen={isOpen}
          onClose={() => {
            setIsScanning(true);
            onClose();
          }}
        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>グループ名が重複しています</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Text>{message}</Text>
            </ModalBody>
            <ModalFooter>
              <Button
                colorScheme="blue"
                mr={3}
                onClick={() =>
                  handleSubmit(true).then(() => {
                    onClose();
                    setIsScanning(true);
                  })
                }
              >
                はい
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  onClose();
                  setIsScanning(true);
                }}
              >
                いいえ
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </ChakraProvider>
  );
};

export default App;
