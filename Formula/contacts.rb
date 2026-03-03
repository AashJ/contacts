class Contacts < Formula
  desc "Cross-platform contacts CLI"
  homepage "https://github.com/aashj/contacts"
  license "MIT"
  version "0.1.2"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/aashj/contacts/releases/download/v0.1.2/contacts-v0.1.2-macos-arm64.tar.gz"
      sha256 "4a195398941ca8c8ffc025195a5fa9ff032586fc0b9126aed5ea8a5ba023c041"
    else
      url "https://github.com/aashj/contacts/releases/download/v0.1.2/contacts-v0.1.2-macos-x64.tar.gz"
      sha256 "33b076d01607d384308d75a394db35afdf0b94dd7821c0113914fc99c5ce1ef5"
    end
  end

  on_linux do
    url "https://github.com/aashj/contacts/releases/download/v0.1.2/contacts-v0.1.2-linux-x64.tar.gz"
    sha256 "8fa9fd8b212d62876761249589daa9264b24b39accadc85a096240e7ad9d1235"
  end

  def install
    if OS.mac?
      if Hardware::CPU.arm?
        bin.install "contacts-v#{version}-macos-arm64" => "contacts"
      else
        bin.install "contacts-v#{version}-macos-x64" => "contacts"
      end
    else
      bin.install "contacts-v#{version}-linux-x64" => "contacts"
    end
  end

  test do
    assert_match "contacts", shell_output("#{bin}/contacts --help")
  end
end
